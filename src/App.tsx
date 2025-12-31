/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Upload, FileDown, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setSuccess(false);
    } else if (selectedFile) {
      setError('Please select a valid PDF file.');
      setFile(null);
    }
  };

  const processPdf = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setSuccess(false);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      // Calculate total pages needed (multiple of 4)
      const totalPages = Math.ceil(pageCount / 4) * 4;
      
      // Create a new PDF for the final output
      const finalPdfDoc = await PDFDocument.create();
      
      // Get the size of the first page to use for blank pages
      const firstPage = pdfDoc.getPages()[0];
      const { width, height } = firstPage.getSize();

      // Reorder pages for booklet
      // Order: N, 1, 2, N-1, N-2, 3, 4, N-3, ...
      const reorderedIndices: number[] = [];
      const n = totalPages;
      const sheets = n / 4;

      for (let i = 1; i <= sheets; i++) {
        // Front Left: n - 2(i-1)
        reorderedIndices.push(n - 2 * (i - 1) - 1);
        // Front Right: 2i - 1
        reorderedIndices.push(2 * i - 1 - 1);
        // Back Left: 2i
        reorderedIndices.push(2 * i - 1);
        // Back Right: n - 2i + 1
        reorderedIndices.push(n - 2 * i + 1 - 1);
      }

      // We need to copy pages one by one or in bulk, but handle blank pages
      for (const index of reorderedIndices) {
        if (index < pageCount) {
          // Copy existing page
          const [copiedPage] = await finalPdfDoc.copyPages(pdfDoc, [index]);
          finalPdfDoc.addPage(copiedPage);
        } else {
          // Add blank page
          finalPdfDoc.addPage([width, height]);
        }
      }

      const pdfBytes = await finalPdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `booklet_${file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError('An error occurred while processing the PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-900">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl mb-4">
            <FileText size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">A5 Booklet Maker</h1>
          <p className="text-slate-500 mt-2">
            Upload an A4 PDF to reorder pages for booklet printing.
          </p>
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all
            ${file ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'}
          `}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-3">
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center transition-colors
              ${file ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-indigo-500'}
            `}>
              {file ? <CheckCircle2 size={24} /> : <Upload size={24} />}
            </div>
            <div>
              <p className="font-medium text-slate-700">
                {file ? file.name : 'Choose a PDF file'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'or drag and drop here'}
              </p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm overflow-hidden"
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-600 text-sm overflow-hidden"
            >
              <CheckCircle2 size={18} />
              <span>Success! Your booklet is ready.</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          disabled={!file || isProcessing}
          onClick={processPdf}
          className={`
            w-full mt-8 py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all
            ${!file || isProcessing 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'}
          `}
        >
          {isProcessing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileDown size={20} />
              Generate Booklet PDF
            </>
          )}
        </button>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">How to print:</h2>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Open the generated PDF.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
              <span>Print with <strong>"2 pages per sheet"</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Set duplex to <strong>"Flip on short edge"</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
              <span>Fold the stack in half to make your A5 booklet!</span>
            </li>
          </ul>
        </div>
      </motion.div>
      
      <footer className="mt-8 text-slate-400 text-xs text-center">
        <p>© {new Date().getFullYear()} A5 Booklet Maker</p>
        <p className="mt-1">Privacy: Your PDF is processed entirely in your browser.</p>
      </footer>
    </div>
  );
}

