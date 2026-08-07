// lucide-react no longer ships trademarked brand icons, so these small monochrome glyphs
// (simple, standard "follow us" style marks, drawn from scratch) fill that gap without pulling
// in another icon package. Each takes the same {size, className} shape as a lucide icon.
import React from 'react';

function Base({ size = 16, className = '', children, viewBox = '0 0 24 24' }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="currentColor" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export function FacebookIcon(props) {
  return (
    <Base {...props}>
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z" />
    </Base>
  );
}
export function InstagramIcon(props) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1.1" />
    </Base>
  );
}
export function YoutubeIcon(props) {
  return (
    <Base {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.2 9.3l5 2.7-5 2.7z" />
    </Base>
  );
}
export function XIcon(props) {
  return (
    <Base {...props}>
      <path d="M4 4l16 16M20 4L4 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </Base>
  );
}
export function TiktokIcon(props) {
  return (
    <Base {...props}>
      <path d="M14 3v10.6a2.6 2.6 0 1 1-2-2.53V9c-2.3.1-4 2-4 4.4a4.4 4.4 0 0 0 8.8 0V8.2a6 6 0 0 0 3.2 1V7a4 4 0 0 1-4-4h-2z" />
    </Base>
  );
}
export function WhatsappIcon(props) {
  return (
    <Base {...props}>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20z" />
      <path d="M17 14.4c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.2-.4.1-.2 0-.4 0-.5-.1-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s1 2.5 1.1 2.6c.1.2 1.9 3 4.7 4.1.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.6-.6 1.8-1.3.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.5-.3z" />
    </Base>
  );
}
