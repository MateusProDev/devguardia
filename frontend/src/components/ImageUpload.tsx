'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { marketplaceApi } from '../services/marketplace';

interface ImageUploadProps {
  currentUrl?: string;
  onUploaded: (url: string) => void;
  onRemove: () => void;
  label?: string;
  aspectHint?: string;
}

export default function ImageUpload({
  currentUrl,
  onUploaded,
  onRemove,
  label,
  aspectHint,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(currentUrl || '');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!allowed.includes(file.type)) {
      setError('Formato inválido. Use JPEG, PNG, WebP, GIF ou AVIF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo: 10MB.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const url = await marketplaceApi.uploadImage(file);
      setPreview(url);
      onUploaded(url);
    } catch (err: any) {
      setError(err.message ?? 'Falha no upload.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleRemove() {
    setPreview('');
    onRemove();
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-mono text-gray-600">
          {label}
          {aspectHint && <span className="text-gray-700 ml-1">({aspectHint})</span>}
        </p>
      )}

      {preview ? (
        <div className="relative inline-block border border-green-500/20 bg-black/40">
          <img
            src={preview}
            alt="preview"
            className="max-h-36 max-w-xs object-contain block"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
            title="Remover imagem"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-3 border border-dashed border-green-500/25 hover:border-green-500/50 text-gray-600 hover:text-green-400 font-mono text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              ENVIANDO...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              SELECIONAR_IMAGEM
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={handleFile}
        className="hidden"
      />

      {error && <p className="text-xs font-mono text-red-400">{error}</p>}
    </div>
  );
}
