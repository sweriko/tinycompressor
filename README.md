## TinyPNG has the best Image compression out there-but their webapp blocks anything over 5MB unless you pay.
(fair enough, good biz model)

**But I’m broke, so I used their free API (gives you 500/month without feature limitation) and built my own wrapper:**

**Cloudflare Worker backend + R2 bucket-frontend = free to host.**

Does compression, conversion, and resizing using the best image algorithm sauce there is
(tinypng is truly the best, sadly closed source)


![Screenshot 2025-07-06 145018](https://github.com/user-attachments/assets/8603308c-29c7-453c-b297-2169a6dffece)
