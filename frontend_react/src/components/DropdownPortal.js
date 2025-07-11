import React from 'react';
import { createPortal } from 'react-dom';

const DropdownPortal = ({ children, position }) => {
  const portalRoot = document.getElementById('portal-root');

  if (!portalRoot) return null;

  const style = {
    position: 'absolute',
    top: position.top,
    left: position.left,
    zIndex: 9999
  };

  return createPortal(
    <div style={style} className="dropdown-menu bg-white border shadow-lg rounded w-32">
      {children}
    </div>,
    portalRoot
  );
};

export default DropdownPortal;
