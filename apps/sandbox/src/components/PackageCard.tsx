import { useNavigate } from 'react-router-dom';
import type { OSPackage } from '../data/packages';

interface PackageCardProps {
    package: OSPackage;
}

export function PackageCard({ package: pkg }: PackageCardProps) {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate(pkg.route)}
            className="group relative flex flex-col items-start justify-between p-6 bg-gradient-to-br from-gray-900 to-gray-800 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 w-80 h-32"
        >
            {/* Icon and Name Container */}
            <div className="flex items-center gap-4 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500/10 to-purple-500/10 group-hover:from-blue-500/20 group-hover:to-purple-500/20 transition-all duration-300">
                    <pkg.icon className="w-6 h-6 text-blue-400 group-hover:text-blue-300 transition-colors" />
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                    {pkg.name}
                </h3>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-400 line-clamp-2 group-hover:text-gray-300 transition-colors flex-1">
                {pkg.description}
            </p>

            {/* Category Badge */}
            <div className="absolute top-2 right-2">
                <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-300">
                    {pkg.category}
                </span>
            </div>

            {/* Hover Effect Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300" />
        </button>
    );
}
