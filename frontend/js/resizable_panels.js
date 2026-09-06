/**
 * ORCA Simple Resizable Layout Engine
 * Lightweight, rock-solid drag handles for:
 * 1. Left Sidebar width (resizerSidebar)
 * 2. Right Chat Panel width (resizerChatPanel)
 * (Center Workspace Ocean Cockpit is 100% full-height)
 */

function initResizablePanels() {
  const sidebar = document.getElementById('appSidebar');
  const resizerSidebar = document.getElementById('resizerSidebar');
  const chatPanel = document.getElementById('rightChatPanel');
  const resizerChat = document.getElementById('resizerChatPanel');
  const mapPanel = document.getElementById('centerTopMapPanel');

  // Explicitly clear legacy map height so map is 100% full-height
  try {
    localStorage.removeItem('orca_map_height');
    if (mapPanel) {
      mapPanel.style.height = '';
    }
  } catch (e) {}

  // Load saved dimensions from localStorage if available
  try {
    const savedSidebarWidth = localStorage.getItem('orca_sidebar_width');
    if (savedSidebarWidth && sidebar) {
      const parsed = parseInt(savedSidebarWidth, 10);
      if (parsed >= 140 && parsed <= 360) {
        sidebar.style.width = parsed + 'px';
      }
    }
    const savedChatWidth = localStorage.getItem('orca_chat_width');
    if (savedChatWidth && chatPanel) {
      const parsed = parseInt(savedChatWidth, 10);
      if (parsed >= 280 && parsed <= 560) {
        chatPanel.style.width = parsed + 'px';
      }
    }
  } catch (e) {}

  // Helper to trigger Leaflet and Windy Animator resize recalculation
  const notifyMapResize = () => {
    if (window.miniMapInstance) {
      window.miniMapInstance.invalidateSize({ pan: false });
    }
    if (window.miniWindyAnimator) {
      window.miniWindyAnimator._resizeCanvas();
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
      sidebar.style.width = '195px';
      try { localStorage.removeItem('orca_sidebar_width'); } catch(e){}
      notifyMapResize();
    });
  }

  // 2. Right Chat Panel Horizontal Resize (Right Side)
  if (chatPanel && resizerChat) {
    let startX = 0;
    let startWidth = 0;

    const onPointerMoveChat = (e) => {
      const dx = startX - e.clientX;
      let newWidth = startWidth + dx;
      if (newWidth < 220) newWidth = 220;
      if (newWidth > 750) newWidth = 750;
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
      chatPanel.style.width = '380px';
      try { localStorage.removeItem('orca_chat_width'); } catch(e){}
      notifyMapResize();
    });
  }
}
