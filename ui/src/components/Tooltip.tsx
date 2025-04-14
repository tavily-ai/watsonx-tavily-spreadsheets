import { useRef, useState } from "react";
import { Globe, Info } from "lucide-react";

export type Source = {
  title: string;
  url: string;
};

type SourcesTooltipProps = {
  sources: Source[];
  open: boolean;
  setOpen: (value: boolean) => void;
};

export default function SourcesTooltip({ sources }: SourcesTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-block flex align-center"
      ref={tooltipRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="focus:outline-none"
      >
        <Info className="w-5 h-5 text-blue-500 cursor-pointer" />
      </button>
      {open && (
        <div
          className="absolute left-0 mt-5 w-64 bg-white shadow-lg rounded-lg border border-gray-200 p-3 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Sources</h4>
          <ul className="max-h-60 overflow-y-auto">
            {sources.map((source, index) => {
              const { title, url } = source;

              return (
                <li key={index} className="flex items-center space-x-2 py-1">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 text-sm truncate w-full hover:underline"
                    style={{ display: "inline-block", maxWidth: "85%" }}
                  >
                    {title}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
