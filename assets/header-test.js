/* ================================================
   HEADER TEST - NIKE STYLE JAVASCRIPT
   Extracted from sections/header-test.liquid
   Version: 7.4 Optimized
   ================================================ */

(function() {
  'use strict';
  
  // Attendre que le DOM soit chargé
  document.addEventListener('DOMContentLoaded', function() {
    // --- Sélecteurs ---
    const wrapper = document.querySelector('.nike-header-wrapper');
    const overlay = document.getElementById('nike-overlay');
    const body = document.body;
    const header = document.getElementById('main-header');
    
    // Desktop Search
    const desktopSearchInput = document.getElementById('desktop-search-input');
    const desktopSearchContainer = document.getElementById('desktop-search-container');
    const desktopSearchCancel = document.getElementById('desktop-search-cancel');
    const desktopSearchClear = document.getElementById('desktop-search-clear');
    const popularContainer = document.getElementById('desktop-popular-searches');
    const predictiveContainer = document.getElementById('desktop-predictive-results');
    
    // Mobile & Drawer
    const mobileDrawer = document.getElementById('mobile-drawer');
    const mobileMenuTrigger = document.getElementById('mobile-menu-trigger');
    const desktopMenuTrigger = document.getElementById('desktop-menu-trigger');
    const mobileDrawerClose = document.getElementById('mobile-drawer-close');
    const mobileSearchOverlay = document.getElementById('mobile-search-overlay');
    const mobileSearchTrigger = document.getElementById('mobile-search-trigger');
    const mobileSearchCancel = document.getElementById('mobile-search-cancel');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const mobilePopularContainer = document.getElementById('mobile-popular-searches');
    const mobilePredictiveContainer = document.getElementById('mobile-predictive-results');
    
    // Navigation Stack
    const navStack = ['panel-main'];

    // --- Utility Functions ---
    
    /**
     * Debounce function pour limiter les appels API
     */
    function debounce(func, wait) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }

    /**
     * Fetch Predictive Search Results
     */
    function fetchPredictiveResults(term, container) {
      fetch(`/search/suggest.json?q=${term}&resources[type]=product,query&resources[limit]=10&section_id=predictive-search`)
        .then(response => response.json())
        .then(data => {
          const resources = data.resources.results;
          const products = resources.products || [];
          const queries = resources.queries || [];

          const limitedProducts = products.slice(0, 4); // 4 produits
          const limitedQueries = queries.slice(0, 4);

          let html = '';

          // Colonne Gauche (Suggestions)
          if(limitedQueries.length > 0 || term.length > 0) {
            html += `<div class="predictive-col-left">
                      <div class="nike-search-title">Meilleures suggestions</div>
                      <ul class="predictive-suggestions-list">`;
            
            if(limitedQueries.length > 0) {
              limitedQueries.forEach(q => {
                const regex = new RegExp(`(${term})`, "gi");
                const text = q.text.replace(regex, "<strong>$1</strong>");
                html += `<li><a href="${q.url}" class="predictive-suggestion-link">${text}</a></li>`;
              });
            } else {
              html += `<li><a href="/search?q=${term}" class="predictive-suggestion-link"><strong>${term}</strong></a></li>`;
              html += `<li><a href="/search?q=${term}+homme" class="predictive-suggestion-link"><strong>${term}</strong> homme</a></li>`;
              html += `<li><a href="/search?q=${term}+femme" class="predictive-suggestion-link"><strong>${term}</strong> femme</a></li>`;
            }
            html += `</ul></div>`;
          }

          // Colonne Droite (Produits)
          html += `<div class="predictive-col-right">`;
          if(limitedProducts.length > 0) {
            html += `<div class="predictive-products-grid">`;
            limitedProducts.forEach(p => {
              let priceDisplay = p.price;
              if (!priceDisplay.includes('€') && !priceDisplay.includes('$')) {
                priceDisplay = priceDisplay + ' €';
              }

              html += `<a href="${p.url}" class="predictive-product-card">
                        <img src="${p.image || ''}" class="predictive-product-image" alt="${p.title}">
                        <div class="predictive-product-title" title="${p.title}">${p.title}</div>
                        <div class="predictive-product-cat">${p.type || ''}</div>
                        <div class="predictive-product-price">${priceDisplay}</div>
                      </a>`;
            });
            html += `</div>`;
          } else {
            html += `<p>Aucun produit trouvé.</p>`;
          }
          html += `</div>`;
          
          container.innerHTML = html;
        })
        .catch(err => console.error('Search Error:', err));
    }

    /**
     * Close Desktop Search
     */
    function closeDesktopSearch() {
      if (!header || !wrapper) return;
      header.classList.remove('search-active');
      wrapper.classList.remove('search-mode-active');
      overlay && overlay.classList.remove('active');
      if(desktopSearchInput) desktopSearchInput.value = '';
      if(popularContainer) popularContainer.classList.remove('hidden');
      if(predictiveContainer) predictiveContainer.classList.remove('active');
    }

    /**
     * Close Mobile Drawer
     */
    function closeMobileDrawer() {
      if (!mobileDrawer) return;
      mobileDrawer.classList.remove('is-open');
      overlay && overlay.classList.remove('active');
      body.classList.remove('menu-open');
    }

    /**
     * Reset Mobile Navigation
     */
    function resetMobileNav() {
      const panels = document.querySelectorAll('.nike-nav-panel');
      panels.forEach(p => {
        if(p.id === 'panel-main') {
          p.classList.add('is-active');
          p.classList.remove('is-background');
        } else {
          p.classList.remove('is-active', 'is-background');
        }
      });
      navStack.length = 0;
      navStack.push('panel-main');
    }

    // --- Event Listeners ---

    // Cart Buttons
    const cartButtons = document.querySelectorAll('[data-cart-drawer-open]');
    cartButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.cartDrawerInstance) {
          window.cartDrawerInstance.open();
        } else {
          const cartDrawerElement = document.querySelector('cart-drawer');
          if(cartDrawerElement) {
            cartDrawerElement.classList.add('active'); 
          } else {
            window.location.href = '/cart';
          }
        }
      });
    });

    // Desktop Search Input - Focus
    if(desktopSearchInput && header && wrapper) {
      desktopSearchInput.addEventListener('focus', () => {
        header.classList.add('search-active');
        wrapper.classList.add('search-mode-active');
        overlay && overlay.classList.add('active');
      });

      // Desktop Search Input - Input (avec debounce)
      desktopSearchInput.addEventListener('input', debounce(function(e) {
        const term = e.target.value.trim();
        if(term.length > 0) {
          popularContainer && popularContainer.classList.add('hidden');
          predictiveContainer && predictiveContainer.classList.add('active');
          fetchPredictiveResults(term, predictiveContainer);
        } else {
          popularContainer && popularContainer.classList.remove('hidden');
          predictiveContainer && predictiveContainer.classList.remove('active');
          if(predictiveContainer) predictiveContainer.innerHTML = '';
        }
      }, 300));

      // Desktop Search Clear Button
      if(desktopSearchClear) {
        desktopSearchClear.addEventListener('click', () => {
          desktopSearchInput.value = '';
          desktopSearchInput.focus();
          popularContainer && popularContainer.classList.remove('hidden');
          predictiveContainer && predictiveContainer.classList.remove('active');
          if(predictiveContainer) predictiveContainer.innerHTML = '';
        });
      }
    }

    // Desktop Search Cancel
    if(desktopSearchCancel) {
      desktopSearchCancel.addEventListener('click', closeDesktopSearch);
    }

    // Overlay Click (ferme search et drawer)
    if(overlay) {
      overlay.addEventListener('click', () => {
        closeDesktopSearch();
        closeMobileDrawer();
      });
    }

    // Mobile Menu Trigger (ouverture à droite)
    if(mobileMenuTrigger && mobileDrawer) {
      mobileMenuTrigger.addEventListener('click', () => {
        mobileDrawer.classList.remove('drawer-left');
        mobileDrawer.classList.add('is-open');
        overlay && overlay.classList.add('active');
        body.classList.add('menu-open');
        resetMobileNav();
      });
    }

    // Desktop Menu Trigger (ouverture à gauche)
    if(desktopMenuTrigger && mobileDrawer) {
      desktopMenuTrigger.addEventListener('click', () => {
        mobileDrawer.classList.add('drawer-left');
        mobileDrawer.classList.add('is-open');
        overlay && overlay.classList.add('active');
        body.classList.add('menu-open');
        resetMobileNav();
      });
    }

    // Mobile Drawer Close
    if(mobileDrawerClose) {
      mobileDrawerClose.addEventListener('click', closeMobileDrawer);
    }

    // Mobile Search Trigger
    if(mobileSearchTrigger && mobileSearchOverlay) {
      mobileSearchTrigger.addEventListener('click', () => {
        mobileSearchOverlay.classList.add('is-open');
        body.classList.add('menu-open');
        setTimeout(() => {
          if(mobileSearchInput) mobileSearchInput.focus();
        }, 300);
      });
    }

    // Mobile Search Cancel
    if(mobileSearchCancel && mobileSearchOverlay) {
      mobileSearchCancel.addEventListener('click', () => {
        mobileSearchOverlay.classList.remove('is-open');
        body.classList.remove('menu-open');
        if(mobileSearchInput) mobileSearchInput.value = '';
        if(mobilePopularContainer) mobilePopularContainer.classList.remove('hidden');
        if(mobilePredictiveContainer) mobilePredictiveContainer.classList.remove('active');
      });
    }

    // Mobile Search Input
    if(mobileSearchInput) {
      mobileSearchInput.addEventListener('input', debounce(function(e) {
        const term = e.target.value.trim();
        if(term.length > 0) {
          mobilePopularContainer && mobilePopularContainer.classList.add('hidden');
          mobilePredictiveContainer && mobilePredictiveContainer.classList.add('active');
          fetchPredictiveResults(term, mobilePredictiveContainer);
        } else {
          mobilePopularContainer && mobilePopularContainer.classList.remove('hidden');
          mobilePredictiveContainer && mobilePredictiveContainer.classList.remove('active');
          if(mobilePredictiveContainer) mobilePredictiveContainer.innerHTML = '';
        }
      }, 300));
    }

    // --- Global Functions for Panel Navigation ---
    
    /**
     * Open a panel in the mobile drawer
     */
    window.openPanel = function(panelId) {
      const targetPanel = document.getElementById(panelId);
      if(!targetPanel) return;
      
      const currentPanelId = navStack[navStack.length - 1];
      const currentPanel = document.getElementById(currentPanelId);
      
      if(currentPanel) currentPanel.classList.add('is-background');
      targetPanel.classList.add('is-active');
      navStack.push(panelId);
      
      const viewport = document.getElementById('mobile-viewport');
      if(viewport) viewport.scrollTop = 0;
    };

    /**
     * Close current panel and go back
     */
    window.closePanel = function() {
      if(navStack.length <= 1) return;
      
      const currentPanelId = navStack.pop();
      const prevPanelId = navStack[navStack.length - 1];
      const currentPanel = document.getElementById(currentPanelId);
      const prevPanel = document.getElementById(prevPanelId);
      
      if(currentPanel) currentPanel.classList.remove('is-active');
      if(prevPanel) prevPanel.classList.remove('is-background');
    };
  });
})();
