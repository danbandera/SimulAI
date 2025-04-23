import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface InteractiveAvatarProps {
  scenarioId: number;
  scenarioTitle: string;
}

const InteractiveAvatarComponent: React.FC<InteractiveAvatarProps> = ({
  scenarioId,
  scenarioTitle,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = avatarRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !avatarRef.current) return;

    const rect = avatarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - position.x;
    const y = e.clientY - rect.top - position.y;

    avatarRef.current.style.transform = `translate(${x}px, ${y}px)`;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove as any);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove as any);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="relative w-full h-[400px] bg-gray-100 dark:bg-boxdark-2 rounded-lg overflow-hidden">
      <div
        ref={avatarRef}
        className={`absolute cursor-move transition-transform duration-200 ${
          isExpanded ? "scale-150" : "scale-100"
        }`}
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
          {scenarioTitle.charAt(0).toUpperCase()}
        </div>
      </div>
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90"
        >
          {isExpanded ? t("common.collapse") : t("common.expand")}
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t("common.dragToMove")}
        </span>
      </div>
    </div>
  );
};

export default InteractiveAvatarComponent;
