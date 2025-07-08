import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Portal to render dropdown menus outside the DOM flow
 * Props:
 * - position: { top: number, left: number }
 * - children: React node (menu content)
 */
const DropdownPortal = ({ position, children }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        document.dispatchEvent(new CustomEvent('dropdown-close'));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return createPortal(
    <div
      ref={dropdownRef}
      className="absolute z-50"
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>,
    document.body
  );
};

export default DropdownPortal;