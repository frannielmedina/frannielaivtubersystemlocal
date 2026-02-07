Failed to compile.
04:49:57.046 
04:49:57.046 
./src/services/STTService.ts:68:16
04:49:57.046 
Type error: Expected 1 arguments, but got 0.
04:49:57.046 
04:49:57.046 
  66 |       if (this.config.enabled && this.config.continuous && this.isListening) {
04:49:57.046 
  67 |         setTimeout(() => {
04:49:57.046 
> 68 |           this.start();
04:49:57.046 
     |                ^
04:49:57.047 
  69 |         }, 100);
04:49:57.047 
  70 |       } else {
04:49:57.047 
  71 |         this.isListening = false;
04:49:57.075 
Next.js build worker exited with code: 1 and signal: null
04:49:57.138 
Error: Command "npm run build" exited with 1
