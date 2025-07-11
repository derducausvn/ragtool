import React from 'react';

const QuestionnaireResults = ({ results }) => {
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      {results.map((item, index) => (
        <div key={index} className="bg-gray-50 p-3 rounded-lg border">
          <p className="text-sm font-medium text-gray-700">{item.question}</p>
          <div className="text-sm mt-1 text-gray-800 whitespace-pre-line">
            {item.answer.split('\n').map((line, i) =>
              line.trim().startsWith('-') ? (
                <div key={i} style={{ marginLeft: 12 }}>{line}</div>
              ) : (
                <div key={i}>{line}</div>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuestionnaireResults;
