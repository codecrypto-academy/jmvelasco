import { GoToDashboard } from '../components/ui/GoToDashboard';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
      <div className="text-center p-8 rounded-xl shadow-lg bg-white/90 backdrop-blur-md">
        <h1 className="text-5xl font-extrabold text-blue-600 mb-4 drop-shadow-lg">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Oops! Page not found</h2>
        <p className="text-lg text-gray-600 mb-6">
          Looks like you got lost in the supply chain.
          <br />
          Go back to the dashboard to keep tracking products.
        </p>
        <GoToDashboard className="mt-6 px-6 py-3 bg-blue-500 text-white font-bold rounded-lg shadow hover:bg-blue-600 transition">
          Go to Dashboard
        </GoToDashboard>
        <div className="mt-8 text-sm text-gray-400">
          <span role="img" aria-label="map">
            🗺️
          </span>{' '}
          Navigating with transparency and traceability
        </div>
      </div>
    </div>
  );
}
