interface ProcessImageRequest {
  image: File;
  apiKey: string;
  mode: 'compressor' | 'converter' | 'resizer';
  targetFormat?: string;
  customWidth?: string;
  customHeight?: string;
  aspectRatioLocked?: boolean;
  resizePercentage?: number;
}

interface ProcessImageResponse {
  success: boolean;
  data?: {
    compressedImageData: string;
    compressedSize: number;
    filename: string;
  };
  error?: string;
}

interface Env {
  STATIC_FILES: R2Bucket;
}

// CORS headers for browser compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Handle GET requests for static files
    if (request.method === 'GET') {
      return await handleStaticFiles(request, env.STATIC_FILES);
    }

    // Handle POST requests for image processing
    if (request.method === 'POST') {
      return await handleImageProcessing(request);
    }

    // Method not allowed
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};

async function handleStaticFiles(request: Request, bucket: R2Bucket): Promise<Response> {
  const url = new URL(request.url);
  let key = url.pathname.substring(1); // Remove leading slash
  
  // Default to index.html for root path
  if (key === '' || key === '/') {
    key = 'index.html';
  }
  
  try {
    const object = await bucket.get(key);
    
    if (object === null) {
      return new Response('Not Found', { status: 404 });
    }
    
    // Get content type based on file extension
    const contentType = getContentType(key);
    
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    return new Response(object.body, { headers });
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 });
  }
}

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'html':
      return 'text/html';
    case 'js':
      return 'application/javascript';
    case 'css':
      return 'text/css';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

async function handleImageProcessing(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const apiKey = formData.get('apiKey') as string;
    const mode = formData.get('mode') as string || 'compressor';
    const targetFormat = formData.get('targetFormat') as string;
    const customWidth = formData.get('customWidth') as string;
    const customHeight = formData.get('customHeight') as string;
    const aspectRatioLocked = formData.get('aspectRatioLocked') === 'true';
    const resizePercentage = formData.get('resizePercentage') as string;

    console.log('Image file:', imageFile ? `${imageFile.name} (${imageFile.size} bytes)` : 'null');
    console.log('API key:', apiKey ? 'present' : 'missing');
    console.log('Mode:', mode);

    // Validate inputs
    if (!imageFile || !apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Missing image file or API key. ImageFile: ${!!imageFile}, ApiKey: ${!!apiKey}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate image type
    if (!imageFile.type.startsWith('image/')) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid file type. Only images are allowed.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file size (TinyPNG API limit is 500MB, but let's set a reasonable limit for Cloudflare Workers)
    const maxSize = 100 * 1024 * 1024; // 100MB (Cloudflare Workers limit)
    if (imageFile.size > maxSize) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'File too large. Maximum size is 100MB (Cloudflare Workers limit).' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert file to buffer
    const imageBuffer = await imageFile.arrayBuffer();
    const imageData = new Uint8Array(imageBuffer);

    console.log(`Starting ${mode} for ${imageFile.name} (${imageFile.size} bytes)`);
    const startTime = Date.now();
    
    // Process image based on mode
    let processedData: ArrayBuffer;
    let fileExtension = 'png';
    let resolutionData: any = {};
    
    if (mode === 'converter') {
      processedData = await convertImage(imageData, apiKey, targetFormat);
      fileExtension = targetFormat?.split('/')[1] || 'png';
    } else if (mode === 'resizer') {
      const resizeOptions = {
        customWidth: customWidth ? parseInt(customWidth) : undefined,
        customHeight: customHeight ? parseInt(customHeight) : undefined,
        aspectRatioLocked,
        resizePercentage: resizePercentage ? parseInt(resizePercentage) : undefined
      };
      const resizeResult = await resizeImage(imageData, apiKey, resizeOptions);
      processedData = resizeResult.data;
      resolutionData = resizeResult.resolution;
    } else {
      // Default compression
      processedData = await compressImage(imageData, apiKey);
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`${mode} completed in ${processingTime}ms`);

    // Generate filename for processed image
    const originalName = imageFile.name;
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const suffix = mode === 'compressor' ? 'compressed' : mode === 'converter' ? 'converted' : 'resized';
    const processedFilename = `${nameWithoutExt}_${suffix}.${fileExtension}`;

    // Convert processed data to base64
    const base64Data = arrayBufferToBase64(processedData);

    const response: ProcessImageResponse = {
      success: true,
      data: {
        compressedImageData: base64Data,
        compressedSize: processedData.byteLength,
        filename: processedFilename,
        ...resolutionData,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing image:', error);
    
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function compressImage(imageData: Uint8Array, apiKey: string): Promise<ArrayBuffer> {
  try {
    console.log(`Uploading image to TinyPNG: ${imageData.byteLength} bytes`);
    
    // Upload and get compressed image URL
    const compressedUrl = await uploadToTinyPNG(imageData, apiKey);
    
    // Download compressed image
    const auth = btoa(`api:${apiKey}`);
    const downloadResponse = await fetch(compressedUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!downloadResponse.ok) {
      throw new Error('Failed to download compressed image');
    }

    return await downloadResponse.arrayBuffer();

  } catch (error) {
    console.error('TinyPNG compression error:', error);
    throw error;
  }
}

async function convertImage(imageData: Uint8Array, apiKey: string, targetFormat: string): Promise<ArrayBuffer> {
  // First compress the image
  const compressedUrl = await uploadToTinyPNG(imageData, apiKey);
  
  // Then convert it
  const auth = btoa(`api:${apiKey}`);
  const convertResponse = await fetch(compressedUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      convert: { type: targetFormat }
    })
  });

  if (!convertResponse.ok) {
    throw new Error(`Failed to convert image: ${convertResponse.status}`);
  }

  return await convertResponse.arrayBuffer();
}

async function resizeImage(imageData: Uint8Array, apiKey: string, options: {
  customWidth?: number;
  customHeight?: number;
  aspectRatioLocked?: boolean;
  resizePercentage?: number;
}): Promise<{data: ArrayBuffer, resolution: {originalResolution: string, newResolution: string}}> {
  // First compress the image and get the URL
  const compressedUrl = await uploadToTinyPNG(imageData, apiKey);
  
  // Get original image dimensions from the compressed version
  const auth = btoa(`api:${apiKey}`);
  const infoResponse = await fetch(compressedUrl, {
    method: 'HEAD',
    headers: {
      'Authorization': `Basic ${auth}`,
    }
  });
  
  const originalWidth = parseInt(infoResponse.headers.get('Image-Width') || '0');
  const originalHeight = parseInt(infoResponse.headers.get('Image-Height') || '0');
  
  let resizeOptions: any = {};
  
  if (options.resizePercentage) {
    // Calculate new dimensions based on percentage
    const newWidth = Math.round(originalWidth * (options.resizePercentage / 100));
    const newHeight = Math.round(originalHeight * (options.resizePercentage / 100));
    
    resizeOptions = {
      resize: {
        method: 'fit',
        width: newWidth,
        height: newHeight
      }
    };
  } else if (options.customWidth || options.customHeight) {
    // Use fit method for custom dimensions
    if (options.customWidth && options.customHeight) {
      resizeOptions = {
        resize: {
          method: 'fit',
          width: options.customWidth,
          height: options.customHeight
        }
      };
    } else {
      // Use scale method when only one dimension is provided
      resizeOptions = {
        resize: {
          method: 'scale',
          ...(options.customWidth && { width: options.customWidth }),
          ...(options.customHeight && { height: options.customHeight })
        }
      };
    }
  } else {
    throw new Error('No resize options provided');
  }

  const resizeResponse = await fetch(compressedUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resizeOptions)
  });

  if (!resizeResponse.ok) {
    const errorData = await resizeResponse.text();
    throw new Error(`Failed to resize image (${resizeResponse.status}): ${errorData}`);
  }

  // Get the new dimensions from the response headers
  const newWidth = resizeResponse.headers.get('Image-Width') || '0';
  const newHeight = resizeResponse.headers.get('Image-Height') || '0';
  
  return {
    data: await resizeResponse.arrayBuffer(),
    resolution: {
      originalResolution: `${originalWidth}x${originalHeight}`,
      newResolution: `${newWidth}x${newHeight}`
    }
  };
}

async function uploadToTinyPNG(imageData: Uint8Array, apiKey: string): Promise<string> {
  const url = 'https://api.tinify.com/shrink';
  const auth = btoa(`api:${apiKey}`);
  
  const uploadResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/octet-stream',
    },
    body: imageData,
  });

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.text();
    let errorMessage = 'TinyPNG API error';
    
    try {
      const errorJson = JSON.parse(errorData);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch (e) {
      errorMessage = errorData || errorMessage;
    }
    
    throw new Error(`TinyPNG API error (${uploadResponse.status}): ${errorMessage}`);
  }

  const uploadResult = await uploadResponse.json() as {
    output: {
      url: string;
      size: number;
      type: string;
    };
  };
  
  return uploadResult.output.url;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binary);
} 