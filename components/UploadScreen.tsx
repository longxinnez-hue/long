import React, { useCallback, useState } from 'react';
import type { ScriptData } from '../types';
import {
  Camera,
  Clock,
  Drama,
  Film,
  Grid,
  Link,
  Lock,
  Map,
  Puzzle,
  Timer,
  UserCheck,
  Wind,
  Zap,
} from 'lucide-react';

interface UploadScreenProps {
  onFileUpload: (data: ScriptData) => void;
  error: string | null;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1">
    <div className="flex items-center gap-3 mb-2">
      {icon}
      <h3 className="font-semibold text-gray-100">{title}</h3>
    </div>
    <p className="text-sm text-gray-400">{description}</p>
  </div>
);

const UploadScreen: React.FC<UploadScreenProps> = ({ onFileUpload, error }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const data = JSON.parse(text);
          onFileUpload(data);
        } catch (err) {
          console.error('Error parsing JSON:', err);
        }
      };
      reader.readAsText(file);
    },
    [onFileUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
        e.dataTransfer.clearData();
      }
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col items-center">
      <div className="w-full lg:w-2/3 xl:w-1/2">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          className={`relative group bg-slate-800/30 border-2 border-dashed border-slate-600 rounded-xl p-8 text-center transition-all duration-300 ${
            isDragging ? 'border-primary scale-105' : 'hover:border-slate-500'
          }`}
        >
          <input
            type="file"
            id="file-upload"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
            accept=".json"
          />
          <div className="flex flex-col items-center justify-center space-y-4">
            <Film
              className={`w-16 h-16 text-slate-500 transition-colors duration-300 ${
                isDragging ? 'text-primary' : 'group-hover:text-slate-400'
              }`}
            />
            <p className="text-lg font-semibold text-gray-300">
              Kéo và thả tệp JSON kịch bản của bạn vào đây
            </p>
            <p className="text-gray-500">hoặc</p>
            <label
              htmlFor="file-upload"
              className="px-6 py-2 bg-primary text-white font-semibold rounded-md cursor-pointer hover:bg-purple-700 transition-colors duration-200"
            >
              Chọn Tệp
            </label>
          </div>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-critical rounded-md text-center text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="w-full mt-12">
        <h2 className="text-2xl font-bold text-center mb-6">Phân tích Toàn diện</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Zap className="w-6 h-6 text-primary" />}
            title="Kiểm tra Vật lý"
            description="Phát hiện các chuyển động phi lý, đảm bảo trọng lực và phản chiếu nhất quán."
          />
          <FeatureCard
            icon={<UserCheck className="w-6 h-6 text-info" />}
            title="Tính nhất quán Nhân vật"
            description="Theo dõi ngoại hình và trạng thái nhân vật (ướt/khô) để đảm bảo logic."
          />
          <FeatureCard
            icon={<Map className="w-6 h-6 text-yellow-300" />}
            title="Tính liên tục Địa điểm"
            description="Đánh dấu các bước nhảy địa điểm phi logic hoặc thay đổi đột ngột."
          />
          <FeatureCard
            icon={<Grid className="w-6 h-6 text-sky-400" />}
            title="Phân tích Không gian"
            description="Ngăn chặn cảnh bị lật ngược, đạo cụ bị trôi và sự không nhất quán về tỷ lệ."
          />
          <FeatureCard
            icon={<Timer className="w-6 h-6 text-orange-400" />}
            title="Phân tích Thời gian"
            description="Xác định các bước nhảy thời gian đột ngột trong thời tiết hoặc ánh sáng."
          />
          <FeatureCard
            icon={<Camera className="w-6 h-6 text-rose-400" />}
            title="Phân tích Máy quay"
            description="Thực thi quy tắc 180 độ, kiểm tra thay đổi tiêu cự và độ cao máy quay."
          />
          <FeatureCard
            icon={<Drama className="w-6 h-6 text-teal-300" />}
            title="Logic Tường thuật"
            description="Kiểm tra các thay đổi cảm xúc đột ngột và đề xuất các cảnh phản ứng còn thiếu."
          />
          <FeatureCard
            icon={<Link className="w-6 h-6 text-green-400" />}
            title="Tính nhất quán Tổng thể"
            description="Áp dụng các bản vá nhất quán để khóa chặt mọi yếu tố, từ ánh sáng đến đạo cụ."
          />
        </div>
      </div>
    </div>
  );
};

export default UploadScreen;
