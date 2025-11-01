import { Link } from 'react-router-dom';

interface GoToDashboardProps {
  /**
   * Additional CSS classes to apply to the link element
   */
  className?: string;
  /**
   * Custom text for the button. Defaults to "Go to Dashboard"
   */
  children?: React.ReactNode;
}

/**
 * Reusable component for "Go to Dashboard" links
 * Provides consistent styling and behavior across the application
 */
export const GoToDashboard = ({
  className = '',
  children = 'Go to Dashboard',
}: GoToDashboardProps) => {
  const defaultClasses =
    'mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 inline-block';
  const combinedClasses = className ? `${defaultClasses} ${className}` : defaultClasses;

  return (
    <Link to="/dashboard" className={combinedClasses}>
      {children}
    </Link>
  );
};
