import React from 'react';

const TocItem = ({ item, onTocClick, currentTocHref }) => {
  // Compare the base href, ignoring any hash fragments
  const isActive = item.href.split('#')[0] === currentTocHref;

  return (
    <li>
      <button
        onClick={() => onTocClick(item.href)}
        className={`w-full text-left p-2 rounded-md text-sm ${
          isActive 
            ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 font-semibold' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        {item.label}
      </button>
      {item.subitems && item.subitems.length > 0 && (
        <ul className="pl-4">
          {item.subitems.map((subitem, index) => (
            <TocItem 
              key={index} 
              item={subitem} 
              onTocClick={onTocClick} 
              currentTocHref={currentTocHref} 
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default TocItem;
