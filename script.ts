import fs from 'fs';

const files = ['src/HMailUI.tsx', 'src/App.tsx', 'src/HMeetUI.tsx'];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  
  // Remove uppercase and tracking-widest from buttons
  content = content.replace(/uppercase tracking-widest /g, '');
  content = content.replace(/uppercase tracking-wider /g, '');
  
  // Remove intense glowing shadows
  content = content.replace(/shadow-\[0_0_15px_rgba[^\]]*\]/g, 'shadow-sm border border-white/5');
  
  // Increase roundness to Apple style
  content = content.replace(/rounded-xl/g, 'rounded-[16px]');
  
  // General CTA backgrounds
  content = content.replace(/bg-blue-600 hover:bg-blue-500/g, 'bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20');
  content = content.replace(/bg-purple-600 hover:bg-purple-500/g, 'bg-primary hover:bg-primary/80 backdrop-blur-md');
  
  // Change primary buttons like in App.tsx
  // "bg-white text-black hover:bg-white/90" -> "bg-white/90 text-black hover:bg-white backdrop-blur-md"
  content = content.replace(/bg-white text-black hover:bg-white\/90/g, 'bg-white text-black hover:bg-white/90 backdrop-blur-md');

  // Solid bright colors replaced with Apple-like shades
  content = content.replace(/bg-red-600 hover:bg-red-500/g, 'bg-red-500/80 hover:bg-red-500 backdrop-blur-md border border-red-500/50');
  
  fs.writeFileSync(file, content);
});

console.log("Replacement complete.");
