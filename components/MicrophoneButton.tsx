
import React from 'react';

interface MicrophoneButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  onClick: () => void;
  disabled: boolean;
}

const MicrophoneIcon: React.FC = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
  </svg>
);

const StopIcon: React.FC = () => (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 6h12v12H6z" />
    </svg>
);

const Spinner: React.FC = () => (
  <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);


const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({ isListening, isProcessing, onClick, disabled }) => {
  let buttonContent;
  let baseClasses = "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out shadow-lg focus:outline-none focus:ring-4";
  let stateClasses = "";

  if (isProcessing) {
    buttonContent = <Spinner />;
    stateClasses = "bg-gray-500 cursor-not-allowed";
  } else if (isListening) {
    buttonContent = <StopIcon />;
    stateClasses = "bg-red-600 hover:bg-red-700 focus:ring-red-400 scale-110";
  } else {
    buttonContent = <MicrophoneIcon />;
    stateClasses = disabled ? "bg-gray-600 cursor-not-allowed opacity-50" : "bg-cyan-500 hover:bg-cyan-600 focus:ring-cyan-300";
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || isProcessing}
      className={`${baseClasses} ${stateClasses}`}
    >
      {buttonContent}
    </button>
  );
};

export default MicrophoneButton;
