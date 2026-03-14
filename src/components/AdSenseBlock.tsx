import { DollarSign } from 'lucide-react';

export default function AdSenseBlock() {
  return (
    <div className="my-8 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-8 border-2 border-dashed border-gray-300">
      <div className="flex items-center justify-center gap-3 text-gray-500">
        <DollarSign className="w-6 h-6" />
        <div className="text-center">
          <p className="font-semibold text-sm">Google AdSense Placement</p>
          <p className="text-xs">Advertisement space - Replace with your AdSense code</p>
        </div>
      </div>
    </div>
  );
}
