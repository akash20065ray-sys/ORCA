/**
 * ORCA Simple Resizable Layout Engine
 * Lightweight, simple drag handles for:
 * 1. Left Sidebar width (resizerSidebar)
 * 2. Center Vertical Map vs Overview height (resizerCenterRow)
 * 3. Right Chat Panel width (resizerChatPanel)
 */

function initResizablePanels() {
  const sidebar = document.getElementById('appSidebar');
  const resizerSidebar = document.getElementById('resizerSidebar');
  
  const mapPanel = document.getElementById('centerTopMapPanel');
  const resizerCenterRow = document.getElementById('resizerCenterRow');

  const chatPanel = document.getElementById('rightChatPanel');
  const resizerChat = document.getElementById('resizerChatPanel');

  // Load saved dimensions from localStorage if available
  try {
    const savedSidebarWidth = localStorage.getItem('orca_sidebar_width');
    if (savedSidebarWidth && sidebar) {
      sidebar.style.width = savedSidebarWidth + 'px';
    }
    const savedChatWidth = localStorage.getItem('orca_chat_width');
    if (savedChatWidth && chatPanel) {
      chatPanel.style.width = savedChatWidth + 'px';
    }
    const savedMapHeight = localStorage.getItem('orca_map_height');
    if (savedMapHeight && mapPanel) {
      mapPanel.style.height = savedMapHeight + 'px';
    }
  } catch (e) {}

  // Helper to trigger Leaflet resize recalculation
  const notifyMapResize = () => {
    if (window.miniMapInstance) {
      window.miniMapInstance.invalidateSize();
    }
  };

  // 1. Sidebar Horizontal Resize (Left Side)
  if (sidebar && resizerSidebar) {
    let startX = 0;
    let startWidth = 0;

    const onPointerMoveSidebar = (e) => {
      const dx = e.clientX - startX;
      let newWidth = startWidth + dx;
      if (newWidth < 140) newWidth = 140;
      if (newWidth > 360) newWidth = 360;
      sidebar.style.width = newWidth + 'px';
      notifyMapResize();
    };

    const onPointerUpSidebar = () => {
      document.body.classList.remove('is-resizing-col');
      window.removeEventListener('pointermove', onPointerMoveSidebar);
      window.removeEventListener('pointerup', onPointerUpSidebar);
      try {
        localStorage.setItem('orca_sidebar_width', sidebar.offsetWidth);
      } catch (e) {}
    };

    resizerSidebar.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = sidebar.offsetWidth;
      document.body.classList.add('is-resizing-col');
      window.addEventListener('pointermove', onPointerMoveSidebar);
      window.addEventListener('pointerup', onPointerUpSidebar);
    });

    resizerSidebar.addEventListener('dblclick', () => {
      sidebar.style.width = '200px';
      try { localStorage.removeItem('orca_sidebar_width'); } catch(e){}
      notifyMapResize();
    });
  }

  // 2. Center Workspace Vertical Resize (Map on Top, Overview on Bottom)
  if (mapPanel && resizerCenterRow) {
    let startY = 0;
    let startHeight = 0;

    const onPointerMoveCenterRow = (e) => {
      const dy = e.clientY - startY;
      let newHeight = startHeight + dy;
      const parent = mapPanel.parentElement;
      const parentHeight = parent ? parent.clientHeight : 600;
      if (newHeight < 150) newHeight = 150;
      if (newHeight > parentHeight - 150) newHeight = parentHeight - 150;
      mapPanel.style.height = newHeight + 'px';
      notifyMapResize();
    };

    const onPointerUpCenterRow = () => {
      document.body.classList.remove('is-resizing-row');
      window.removeEventListener('pointermove', onPointerMoveCenterRow);
      window.removeEventListener('pointerup', onPointerUpCenterRow);
      try {
        localStorage.setItem('orca_map_height', mapPanel.offsetHeight);
      } catch (e) {}
    };

    resizerCenterRow.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      startY = e.clientY;
      startHeight = mapPanel.offsetHeight;
      document.body.classList.add('is-resizing-row');
      window.addEventListener('pointermove', onPointerMoveCenterRow);
      window.addEventListener('pointerup', onPointerUpCenterRow);
    });

    resizerCenterRow.addEventListener('dblclick', () => {
      mapPanel.style.height = '52%';
      try { localStorage.removeItem('orca_map_height'); } catch(e){}
      notifyMapResize();
    });
  }

  // 3. Right Chat Panel Horizontal Resize (Right Side)
  if (chatPanel && resizerChat) {
    let startX = 0;
    let startWidth = 0;

    const onPointerMoveChat = (e) => {
      const dx = startX - e.clientX;
      let newWidth = startWidth + dx;
      if (newWidth < 260) newWidth = 260;
      if (newWidth > 600) newWidth = 600;
      chatPanel.style.width = newWidth + 'px';
      notifyMapResize();
    };

    const onPointerUpChat = () => {
      document.body.classList.remove('is-resizing-col');
      window.removeEventListener('pointermove', onPointerMoveChat);
      window.removeEventListener('pointerup', onPointerUpChat);
      try {
        localStorage.setItem('orca_chat_width', chatPanel.offsetWidth);
      } catch (e) {}
    };

    resizerChat.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = chatPanel.offsetWidth;
      document.body.classList.add('is-resizing-col');
      window.addEventListener('pointermove', onPointerMoveChat);
      window.addEventListener('pointerup', onPointerUpChat);
    });

    resizerChat.addEventListener('dblclick', () => {
      chatPanel.style.width = '360px';
      try { localStorage.removeItem('orca_chat_width'); } catch(e){}
      notifyMapResize();
    });
  }
}
