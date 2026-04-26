import { cn } from "@/lib/utils";

interface PhoneFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
}

export function PhoneFrame({ src, alt, className, ...props }: PhoneFrameProps) {
  return (
    <div 
      className={cn(
        "relative mx-auto border-gray-900 border-[8px] rounded-[2.5rem] h-[600px] w-[280px] shadow-2xl bg-white overflow-hidden ring-4 ring-black/5",
        className
      )}
      {...props}
    >
      <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-3xl w-32 mx-auto z-20"></div>
      <img 
        src={src} 
        alt={alt}
        className="w-full h-full object-cover object-top"
      />
    </div>
  );
}
