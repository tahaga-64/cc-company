"use client";

import { useRef, useState, useEffect, useMemo } from "react";

interface Props {
  mode: "photo" | "scan" | "chat";
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
}

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ACCEPTED_TYPES = [...ACCEPTED_IMAGE_TYPES, "application/pdf"];

export default function FileUploader({ mode, selectedFile, onFileSelect }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // オブジェクトURLを生成し、ファイル変更時に旧URLを破棄
  const previewUrl = useMemo(
    () =>
      selectedFile && ACCEPTED_IMAGE_TYPES.includes(selectedFile.type)
        ? URL.createObjectURL(selectedFile)
        : null,
    [selectedFile]
  );
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  if (mode === "chat") return null;

  const handleFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert("対応していないファイル形式です。\nJPEG / PNG / GIF / WebP / PDF をお使いください。");
      return;
    }
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  // --- 写真モード ---
  if (mode === "photo") {
    return (
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        {selectedFile ? (
          <div className="flex items-center gap-3">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="preview"
                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-2xl">
                📄
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{selectedFile.name}</p>
              <p className="text-xs text-gray-400">
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            <button
              onClick={() => onFileSelect(null)}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <span className="text-2xl">📷</span>
              <span className="text-xs text-blue-600 font-medium">カメラで撮影</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl">🖼️</span>
              <span className="text-xs text-gray-500 font-medium">ライブラリから選択</span>
            </button>
          </div>
        )}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleInputChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    );
  }

  // --- スキャンモード ---
  return (
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
      {selectedFile ? (
        <div className="flex items-center gap-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="preview"
              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-red-50 flex items-center justify-center text-2xl">
              📄
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">{selectedFile.name}</p>
            <p className="text-xs text-gray-400">
              {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <button
            onClick={() => onFileSelect(null)}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            isDragging
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 bg-white hover:bg-gray-50"
          }`}
        >
          <span className="text-3xl">📄</span>
          <p className="text-sm font-medium text-gray-600">
            書類をドロップ、またはタップして選択
          </p>
          <p className="text-xs text-gray-400">JPEG / PNG / PDF 対応</p>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
