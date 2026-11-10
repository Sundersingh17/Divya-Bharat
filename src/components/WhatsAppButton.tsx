"use client";

// Set this to the real business WhatsApp number before launch, in
// international format with no + or spaces, e.g. "919876543210".
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919999999999";
const DEFAULT_MESSAGE =
  "Hi Divya Bharat, I have a question about your products.";

export default function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-36 right-4 md:bottom-5 md:right-5 z-[100] w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#25D366] shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
    >
      <svg viewBox="0 0 32 32" className="w-7 h-7 fill-white">
        <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.24.615 4.42 1.78 6.32L4 29l7.86-1.75A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3zm6.98 16.83c-.3.83-1.72 1.59-2.37 1.68-.62.09-1.4.13-2.26-.14-.52-.16-1.19-.38-2.05-.75-3.6-1.55-5.95-5.14-6.13-5.38-.18-.24-1.47-1.95-1.47-3.72 0-1.77.93-2.64 1.26-3 .33-.36.72-.45.96-.45.24 0 .48 0 .69.01.22.01.52-.08.81.62.3.72 1.02 2.49 1.11 2.67.09.18.15.39.03.63-.12.24-.18.39-.36.6-.18.21-.38.47-.54.63-.18.18-.37.38-.16.74.21.36.93 1.53 2 2.48 1.37 1.22 2.53 1.6 2.89 1.78.36.18.57.15.78-.09.21-.24.9-1.05 1.14-1.41.24-.36.48-.3.81-.18.33.12 2.1.99 2.46 1.17.36.18.6.27.69.42.09.15.09.87-.21 1.7z" />
      </svg>
    </a>
  );
}
