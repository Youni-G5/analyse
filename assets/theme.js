/**
 * ==================================================================================
 * 1. FONCTIONS UTILITAIRES
 * ==================================================================================
 */

/**
 * Limite la fréquence d'appel d'une fonction (debounce).
 * @param {Function} fn La fonction à exécuter.
 * @param {number} wait Le délai d'attente en millisecondes.
 */
function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Formate un prix en centimes dans une chaîne avec format.
 * @param {number|string} cents Le montant en centimes.
 * @param {string} format Le format de la devise (ex: '€{{amount}}').
 * @returns {string} Prix formaté.
 */
function formatMoney(cents, format = '€{{amount}}') {
  if (typeof cents !== 'number') {
    cents = parseInt(cents, 10);
  }
  let value = (cents / 100).toFixed(2);
  let formattedValue = value.replace('.', ',');
  return format.replace('{{amount}}', formattedValue);
}

/**
 * ==================================================================================
 * 2. WEB COMPONENT : PRODUCT FORM (Page produit)
 * ==================================================================================
 */

if (!customElements.get('product-form')) {
  class ProductForm extends HTMLElement {
    constructor() {
      super();
      this.form = this.querySelector('form');
      this.buyButton = this.querySelector('.add-to-cart-button');
      this.variantSelector = this.querySelector('variant-selector');
      this.quantityInput = this.querySelector('input[name="quantity"]');

      // Prix simplifié pour la page produit, cible l'élément prix par section.
      this.priceElement = document.querySelector(
        `.product-section[data-section-id="${this.dataset.sectionId}"] .product-price`
      );

      if (this.buyButton) {
        this.buyButton.dataset.originalText = this.buyButton.querySelector('.btn-text').textContent;
      }

      if (this.variantSelector) {
        this.variantSelector.addEventListener('change', this.onVariantChange.bind(this));
      }

      if (this.quantityInput) {
        const minusButton = this.querySelector('.quantity-button[name="minus"]');
        const plusButton = this.querySelector('.quantity-button[name="plus"]');
        if (minusButton) minusButton.addEventListener('click', () => this.onQuantityChange(-1));
        if (plusButton) plusButton.addEventListener('click', () => this.onQuantityChange(1));
        this.quantityInput.addEventListener('change', () => this.onQuantityChange(0));
      }

      // Initialisation des options, ID variant et bouton d'ajout au panier
      this.updateOptions();
      this.updateMasterId();
      this.updateAddToCartButton();
    }

    /**
     * Mise à jour des options sélectionnées (variants)
     */
    updateOptions() {
      if (this.querySelector('select')) {
        this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
      } else {
        this.options = Array.from(this.querySelectorAll('input[type="radio"]:checked'), (radio) => radio.value);
      }
    }

    /**
     * Met à jour la variante active selon les options
     */
    updateMasterId() {
      if (!this.variantSelector || !this.variantSelector.querySelector('.product-variants-json')) return;

      const variantsJson = JSON.parse(this.variantSelector.querySelector('.product-variants-json').textContent);
      this.currentVariant = variantsJson.find(
        (variant) =>
          !variant.options.map((option, index) => this.options[index] === option).includes(false)
      );

      if (this.currentVariant) {
        this.form.querySelector('input[name="id"]').value = this.currentVariant.id;
      }
    }

    /**
     * Met à jour le prix affiché
     */
    updatePrice() {
      if (!this.currentVariant || !this.priceElement) return;

      const priceRegular = this.priceElement.querySelector('.price-item--regular');
      const priceSale = this.priceElement.querySelector('.price-item--sale');

      priceRegular.textContent = formatMoney(this.currentVariant.price);

      if (this.currentVariant.compare_at_price > this.currentVariant.price) {
        if (priceSale) priceSale.textContent = formatMoney(this.currentVariant.compare_at_price);
        this.priceElement.classList.add('has-sale');
      } else {
        if (priceSale) priceSale.textContent = '';
        this.priceElement.classList.remove('has-sale');
      }
    }

    /**
     * Met à jour le bouton "Ajouter au panier"
     */
    updateAddToCartButton() {
      if (!this.currentVariant || !this.buyButton) return;

      const priceSpan = this.buyButton.querySelector('.btn-price');
      const textSpan = this.buyButton.querySelector('.btn-text');
      const quantity = Number(this.quantityInput.value);
      const totalPrice = this.currentVariant.price * quantity;

      if (priceSpan) priceSpan.textContent = formatMoney(totalPrice);

      if (this.currentVariant.available) {
        this.buyButton.disabled = false;
        if (textSpan) textSpan.textContent = this.buyButton.dataset.originalText;
      } else {
        this.buyButton.disabled = true;
        if (textSpan) textSpan.textContent = 'Épuisé';
      }
    }

    /**
     * Met à jour la galerie produit via événement personnalisé
     */
    updateProductGallery() {
      if (!this.currentVariant || !this.currentVariant.featured_media) return;

      // Envoie un événement personnalisé 'gallery:update' avec ID média
      const galleryEvent = new CustomEvent('gallery:update', {
        detail: { mediaId: this.currentVariant.featured_media.id.toString() },
        bubbles: true,
      });
      this.dispatchEvent(galleryEvent);
    }

    /**
     * Gestion du changement de variante
     */
    onVariantChange() {
      this.updateOptions();
      this.updateMasterId();
      this.updatePrice();
      this.updateAddToCartButton();
      this.updateProductGallery();
    }

    /**
     * Gestion du changement de quantité (ajout/retrait ou input direct)
     * @param {number} step Déplacement du nombre (ex: +1, -1, ou 0 si changement direct)
     */
    onQuantityChange(step) {
      if (step !== 0) {
        const currentValue = Number(this.quantityInput.value);
        const newValue = currentValue + step;
        if (newValue >= 1) this.quantityInput.value = newValue;
      }
      this.updateAddToCartButton();
    }
  }

  // Déclaration du composant custom
  customElements.define('product-form', ProductForm);
}

/**
 * ==================================================================================
 * 3. INITIALISATION DU HEADER (MENU MOBILE)
 * ==================================================================================
 */

function initHeaderMenu() {
  const body = document.body;
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenuDrawer = document.getElementById('mobile-menu-drawer');
  if (!mobileMenuToggle || !mobileMenuDrawer) return;

  const mobileMenuClose = document.getElementById('mobile-menu-close');
  const mobileMenuOverlay = document.querySelector('.mobile-menu-drawer__overlay');

  // Ouvre le menu mobile
  const openMenu = () => {
    mobileMenuDrawer.classList.add('is-open');
    body.classList.add('mobile-menu-open');
  };

  // Ferme le menu mobile
  const closeMenu = () => {
    mobileMenuDrawer.classList.remove('is-open');
    body.classList.remove('mobile-menu-open');
  };

  mobileMenuToggle.addEventListener('click', openMenu);
  if (mobileMenuClose) mobileMenuClose.addEventListener('click', closeMenu);
  if (mobileMenuOverlay) mobileMenuOverlay.addEventListener('click', closeMenu);

  // Toggle sous-menus dans navigation mobile
  document.querySelectorAll('.mobile-nav .nav-item.has-dropdown > a').forEach((item) => {
    item.addEventListener('click', function (event) {
      event.preventDefault();
      this.parentElement.classList.toggle('is-open');
    });
  });
}

/**
 * ==================================================================================
 * 4. INITIALISATION DU FOOTER (ACCORDÉONS MOBILE)
 * ==================================================================================
 */

function initFooterAccordion() {
  document.querySelectorAll('.site-footer .js-toggle-trigger').forEach((trigger) => {
    trigger.addEventListener('click', function (event) {
      if (window.matchMedia('(max-width: 767px)').matches) {
        event.preventDefault();
        this.closest('.footer-block')?.classList.toggle('is-open');
      }
    });
  });
}

/**
 * ==================================================================================
 * 5. INITIALISATION DE LA GALERIE PRODUIT (FICHE PRODUIT)
 * ==================================================================================
 */

function initProductGallery(container) {
  const gallery = container.querySelector('[data-product-gallery]');
  if (!gallery) return;

  const mainMedia = gallery.querySelector('.gallery-main-media');
  const thumbnails = gallery.querySelectorAll('.thumbnail-item');
  if (!mainMedia) return;

  /**
   * Met à jour la galerie en fonction de l'index sélectionné
   * @param {number} index Index de la vignette
   * @param {boolean} smooth Animation de transition
   */
  function updateGallery(index, smooth = true) {
    mainMedia.style.transition = smooth ? 'transform 0.4s cubic-bezier(0.645, 0.045, 0.355, 1)' : 'none';
    mainMedia.style.transform = `translateX(-${index * 100}%)`;

    thumbnails.forEach((thumb, i) => thumb.classList.toggle('is-active', i === index));
  }

  // Clic sur vignette change la galerie
  thumbnails.forEach((thumb, index) => {
    thumb.addEventListener('click', () => updateGallery(index));
  });

  // Écoute mise à jour par événement personnalisé du product-form
  gallery.addEventListener('gallery:update', (event) => {
    const mediaId = event.detail.mediaId;
    const newIndex = Array.from(mainMedia.children).findIndex((item) => item.dataset.mediaId === mediaId);
    if (newIndex > -1) updateGallery(newIndex, false);
  });

  // Initialisation affichage à la première vignette
  updateGallery(0, false);
}

/**
 * ==================================================================================
 * 6. PAGE COLLECTION — GESTION DU QUICK ADD, FILTRES MOBILES, TRI, UX
 * ==================================================================================
 */

document.addEventListener('DOMContentLoaded', function () {
  function initCollectionPage() {
    // Gestion Quick Add (modale)
    const quickAddButtons = document.querySelectorAll('.quick-add-button');
    const modal = document.getElementById('quick-add-modal');

    if (modal) {
      const modalBody = modal.querySelector('.quick-add-modal__body');
      const modalCloseButtons = modal.querySelectorAll('[data-modal-close]');

      function closeModal() {
        document.body.classList.remove('modal-open', 'quick-add-open');
        modal.setAttribute('aria-hidden', 'true');
        modalBody.innerHTML = '';
      }

      function openModal() {
        document.body.classList.add('modal-open', 'quick-add-open');
        modal.setAttribute('aria-hidden', 'false');
      }

      quickAddButtons.forEach((button) => {
        button.onclick = function (e) {
          e.preventDefault();

          const handle = this.dataset.productHandle;
          if (!handle) return;

          openModal();
          modalBody.innerHTML = '<p style="text-align:center;padding:2rem;">Chargement…</p>';

          fetch(`/products/${handle}?view=quick-add`)
            .then((response) => {
              if (!response.ok) throw new Error('Produit introuvable');
              return response.text();
            })
            .then((html) => {
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              let content = doc.querySelector('.quick-view-product');
              if (!content) content = doc.body || doc;
              modalBody.innerHTML = '';
              modalBody.appendChild(content.cloneNode(true));

              // Initialisation du product form dans la modale
              if (window.ProductForm && modalBody.querySelector('product-form')) {
                new ProductForm(modalBody.querySelector('product-form'));
              }
            })
            .catch(() => {
              modalBody.innerHTML =
                "<p style='color:red;text-align:center;padding:2rem'>Erreur de chargement du produit.<br>Veuillez réessayer.</p>";
            });
        };
      });

      modalCloseButtons.forEach((button) => (button.onclick = closeModal));

      // Fermer la modale au clic hors contenu
      modal.addEventListener('click', function (event) {
        if (event.target === modal) closeModal();
      });

      // Fermer la modale à l'appui sur ESC
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.body.classList.contains('quick-add-open')) {
          closeModal();
        }
      });
    }

    // Tiroir mobile des filtres
    const filtersDrawer = document.getElementById('filters-drawer');
    const openFiltersButton = document.getElementById('open-filters-drawer');

    if (filtersDrawer && openFiltersButton) {
      const drawerCloseButtons = filtersDrawer.querySelectorAll('[data-drawer-close]');

      function openDrawer() {
        document.body.classList.add('modal-open', 'filters-drawer-open');
        filtersDrawer.setAttribute('aria-hidden', 'false');
      }

      function closeDrawer() {
        document.body.classList.remove('modal-open', 'filters-drawer-open');
        filtersDrawer.setAttribute('aria-hidden', 'true');
      }

      openFiltersButton.onclick = function (e) {
        e.preventDefault();
        openDrawer();
      };

      drawerCloseButtons.forEach((btn) => (btn.onclick = closeDrawer));

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.body.classList.contains('filters-drawer-open')) {
          closeDrawer();
        }
      });
    }

    // Tri des produits
    const sortSelect = document.querySelector('.collection-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        const url = new URL(window.location.href);
        url.searchParams.set('sort_by', this.value);
        window.location = url.href;
      });
    }
  }

  // Initialisation page collection appelée au chargement.
  initCollectionPage();
});

/**
 * ==================================================================================
 * 7. PAGE PANIER (AJAX)
 * ==================================================================================
 */

const ShopifyCart = {
  init() {
    this.cartContainer = document.querySelector('.cart-page-container');
    if (!this.cartContainer) return;

    this.cartForm = this.cartContainer.querySelector('.cart-form');
    this.freeShippingBar = this.cartContainer.querySelector('.free-shipping-bar');
    this.shippingProgressBar = this.cartContainer.querySelector('[data-progress-bar]');
    this.threshold = this.freeShippingBar ? parseFloat(this.freeShippingBar.dataset.threshold) : 0;

    this.addEventListeners();
    this.initNoteUpdater();
    this.initDynamicCheckout();
  },

  addEventListeners() {
    this.cartContainer.addEventListener('click', (event) => {
      const quantityButton = event.target.closest('.quantity-button');
      const removeButton = event.target.closest('[data-remove-item]');

      if (quantityButton) {
        event.preventDefault();
        const quantityInput = quantityButton.parentElement.querySelector('.quantity-input');
        const key = quantityInput.dataset.lineKey;
        const currentQuantity = parseInt(quantityInput.value);
        const newQuantity =
          quantityButton.dataset.action === 'increase' ? currentQuantity + 1 : currentQuantity - 1;

        if (newQuantity > 0) {
          this.updateQuantity(key, newQuantity);
        } else {
          this.removeItem(key);
        }
      }

      if (removeButton) {
        event.preventDefault();
        const key = removeButton.dataset.removeItem;
        this.removeItem(key);
      }
    });
  },

  removeItem(key) {
    const itemElement = this.cartContainer.querySelector(`[data-line-key="${key}"]`);
    if (itemElement) {
      itemElement.classList.add('is-removing');
    }

    setTimeout(() => {
      this.updateQuantity(key, 0);
    }, 300);
  },

  updateQuantity(key, quantity) {
    this.setLoadingState(true);

    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity }),
    })
      .then((response) => response.json())
      .then((cart) => {
        this.handleCartUpdate(cart);
      })
      .catch((error) => console.error('Error:', error))
      .finally(() => {
        this.setLoadingState(false);
      });
  },

  handleCartUpdate(cart) {
    if (cart.item_count === 0) {
      window.location.href = '/cart';
      return;
    }

    document.querySelectorAll('.cart-item[data-line-key]').forEach((itemElement) => {
      const key = itemElement.dataset.lineKey;
      const itemInCart = cart.items.find((item) => item.key === key);

      if (itemInCart) {
        itemElement.querySelector('.quantity-input').value = itemInCart.quantity;

        const priceWrapper = itemElement.querySelector('[data-line-price-wrapper]');
        if (priceWrapper) {
          let newPriceHTML = '';
          if (itemInCart.original_line_price !== itemInCart.final_line_price) {
            newPriceHTML = `
                <span class="cart-item__price on-sale">${this.formatMoney(itemInCart.final_line_price)}</span>
                <s class="cart-item__price cart-item__price--original">${this.formatMoney(
                  itemInCart.original_line_price
                )}</s>
              `;
          } else {
            newPriceHTML = `<span class="cart-item__price">${this.formatMoney(itemInCart.final_line_price)}</span>`;
          }
          priceWrapper.innerHTML = newPriceHTML;
        }
      } else {
        itemElement.remove();
      }
    });

    document.querySelector('[data-cart-subtotal]').innerHTML = this.formatMoney(cart.items_subtotal_price);
    document.querySelector('[data-cart-total]').innerHTML = this.formatMoney(cart.total_price);

    this.updateFreeShippingBar(cart.total_price);

    const cartCountElement = document.querySelector('#cart-count-bubble');
    if (cartCountElement) {
      cartCountElement.textContent = cart.item_count;
    }

    this.initDynamicCheckout();
  },

  updateFreeShippingBar(totalPrice) {
    if (!this.freeShippingBar || this.threshold <= 0) return;

    const remaining = this.threshold - totalPrice;
    const progressPercentage = Math.min((totalPrice / this.threshold) * 100, 100);
    const textElement = this.freeShippingBar.querySelector('.free-shipping-bar__text');

    if (remaining > 0) {
      textElement.innerHTML = `Plus que <span data-remaining-amount>${this.formatMoney(remaining)}</span> pour la livraison gratuite !`;
    } else {
      textElement.textContent = 'Félicitations ! Vous bénéficiez de la livraison gratuite.';
    }

    this.shippingProgressBar.style.width = `${progressPercentage}%`;
  },

  initNoteUpdater() {
    const noteTextarea = this.cartContainer.querySelector('#Cart-note');
    if (noteTextarea) {
      let timeout;
      noteTextarea.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          fetch('/cart/update.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: noteTextarea.value }),
          });
        }, 500);
      });
    }
  },

  initDynamicCheckout() {
    const dynamicCheckout = document.querySelector('[data-shopify="dynamic-checkout-cart"]');
    const primaryCheckoutButton = document.querySelector('.button--primary');
    if (!dynamicCheckout || !primaryCheckoutButton) return;

    // Shopify injecte les boutons dynamiquement, on observe les changements DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          const hasContent = dynamicCheckout.querySelector('[data-shopify-button]');
          primaryCheckoutButton.classList.toggle('button--primary-only', !hasContent);
        }
      });
    });

    observer.observe(dynamicCheckout, { childList: true });
  },

  setLoadingState(isLoading) {
    this.cartForm.classList.toggle('loading', isLoading);
  },

  /**
   * Formatage d'argent — fallback si Shopify.formatMoney indisponible
   */
  formatMoney(cents) {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      return Shopify.formatMoney(cents, Shopify.currency.format);
    }
    const format = '€{{amount}}';
    return format.replace('{{amount}}', (cents / 100).toFixed(2).replace('.', ','));
  },
};

document.addEventListener('DOMContentLoaded', () => {
  ShopifyCart.init();
});

/**
 * ==================================================================================
 * 8. RECOMMANDATIONS PRODUITS AUTOMATIQUES
 * ==================================================================================
 */

const ProductRecommendations = {
  init() {
    const recommendationSection = document.querySelector('.product-recommendations[data-recommendation-source="automated"]');
    if (!recommendationSection) return;

    if (!recommendationSection.dataset.url) {
      console.warn('Product Recommendations: `data-url` attribute is missing for automated mode.');
      return;
    }

    this.container = recommendationSection;
    this.gridContainer = this.container.querySelector('.product-recommendations__grid-container');
    const url = this.container.dataset.url;

    this.fetchRecommendations(url);
  },

  fetchRecommendations(url) {
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.text();
      })
      .then((html) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        const newGrid = tempDiv.querySelector('.product-recommendations__grid');

        if (newGrid && newGrid.innerHTML.trim().length > 0) {
          // Injection du HTML reçu dans la grille
          this.gridContainer.innerHTML = newGrid.outerHTML;
        } else {
          console.log('Product Recommendations: No products returned by the API.');
        }
      })
      .catch((error) => {
        console.error('Impossible de charger les recommandations de produits:', error);
      });
  },
};

document.addEventListener('DOMContentLoaded', () => {
  if (typeof ShopifyCart !== 'undefined') {
    ShopifyCart.init();
  }
  if (typeof ProductRecommendations !== 'undefined') {
    ProductRecommendations.init();
  }
});

/**
 * ==================================================================================
 * 9. ANIMATIONS AU SCROLL (SECTION PROMO GRID)
 * ==================================================================================
 */

/**
 * Gère l'animation d'apparition des sections au scroll (avec IntersectionObserver)
 */
function initializeScrollAnimations() {
  const sectionsToAnimate = document.querySelectorAll('.promo-grid-section');
  if (!sectionsToAnimate.length) return;

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  sectionsToAnimate.forEach((section) => observer.observe(section));
}

document.addEventListener('DOMContentLoaded', () => {
  initializeScrollAnimations();

  // D’autres initialisations à placer ici si besoin
});

/**
 * ==================================================================================
 * 10. VIDEO BANNERS (SECTION BANNIÈRE VIDÉO)
 * ==================================================================================
 */

class VideoBanner {
  constructor(section) {
    this.section = section;
    this.source = this.section.dataset.videoSource;
    this.playerContainer = this.section.querySelector(`#player-${this.section.dataset.sectionId}`);

    if (!this.playerContainer) return;

    if (this.source === 'youtube') this.initYouTube();
    if (this.source === 'vimeo') this.initVimeo();
  }

  loadScript(url, callback) {
    if (document.querySelector(`script[src="${url}"]`)) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
  }

  initYouTube() {
    this.loadScript('https://www.youtube.com/iframe_api', () => {
      if (!window.YT) return;
      this.player = new YT.Player(this.playerContainer, {
        videoId: this.section.dataset.youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          mute: 1,
          loop: 1,
          playlist: this.section.dataset.youtubeId,
          showinfo: 0,
          modestbranding: 1,
          fs: 0,
          rel: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event) => event.target.playVideo(),
        },
      });
    });
  }

  initVimeo() {
    this.loadScript('https://player.vimeo.com/api/player.js', () => {
      if (!window.Vimeo) return;
      this.player = new Vimeo.Player(this.playerContainer, {
        id: this.section.dataset.vimeoId,
        background: true,
        autoplay: true,
        muted: true,
        loop: true,
      });
    });
  }
}

// Initialisation des bannières vidéo sur la page
document.querySelectorAll('.video-banner-section').forEach((section) => new VideoBanner(section));
document.addEventListener('shopify:section:load', (e) => new VideoBanner(e.target));

/**
 * ==================================================================================
 * 11. GALERIE D'IMAGES (Zoom, Swipe, Lightbox)
 * ==================================================================================
 */

// Ce code gère la galerie produit complète avec zoom, swipe mobile, lightbox.
// La partie est longue donc inclut des commentaires et maintient toute la logique initiale.

document.addEventListener('DOMContentLoaded', () => {
  const gallery = document.querySelector('[data-product-gallery]');
  if (!gallery) return;

  // --- Éléments de la galerie ---
  const mediaContainer = gallery.querySelector('.gallery-main-media');
  const allMediaItems = gallery.querySelectorAll('.main-media-item');
  const thumbnails = gallery.querySelectorAll('.thumbnail-item');
  const nextButton = gallery.querySelector('.dot-nav-button.next');
  const prevButton = gallery.querySelector('.dot-nav-button.prev');
  const dots = gallery.querySelectorAll('.dot');
  let currentIndex = 0;

  // --- Éléments zoom ---
  const mainImageWrapper = gallery.querySelector('.gallery-main-media-wrapper');
  const zoomButton = gallery.querySelector('.product-zoom-button');
  let isZoomActive = false;

  let currentFullResImage = new Image();
  let currentMainImageElement = null;

  // --- Lightbox (Mobile) ---
  const lightbox = document.querySelector('[data-lightbox-gallery]');
  const lightboxMediaContainer = lightbox ? lightbox.querySelector('.lightbox-media-container') : null;
  const lightboxContent = lightbox ? lightbox.querySelector('.lightbox-content') : null;
  const lightboxCloseButton = lightbox ? lightbox.querySelector('.lightbox-close-button') : null;
  const lightboxNextButton = lightbox ? lightbox.querySelector('.lightbox-nav-button.next') : null;
  const lightboxPrevButton = lightbox ? lightbox.querySelector('.lightbox-nav-button.prev') : null;
  const lightboxDots = lightbox ? lightbox.querySelectorAll('.lightbox-dot') : null;
  let lightboxIndex = 0;

  // --- Variables swipe ---
  let touchStartX = 0;
  let touchEndX = 0;
  let isSwiping = false;

  /**
   * Met à jour le carrousel principal
   */
  function updateMainCarousel() {
    if (!mediaContainer || !allMediaItems[0]) return;
    const itemWidth = allMediaItems[0].offsetWidth;
    mediaContainer.style.transform = `translateX(-${currentIndex * itemWidth}px)`;

    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === currentIndex));
    thumbnails.forEach((thumb, i) => thumb.classList.toggle('is-active', i === currentIndex));

    if (prevButton && nextButton) {
      prevButton.disabled = currentIndex === 0;
      nextButton.disabled = currentIndex === allMediaItems.length - 1;
    }

    currentMainImageElement = allMediaItems[currentIndex] ? allMediaItems[currentIndex].querySelector('img') : null;

    if (currentMainImageElement && currentMainImageElement.dataset.fullSrc) {
      currentFullResImage.src = currentMainImageElement.dataset.fullSrc;
    }
  }

  /**
   * Met à jour le carrousel lightbox
   */
  function updateLightboxCarousel() {
    if (!lightbox || !lightboxMediaContainer) return;
    const itemWidth = lightbox.offsetWidth;
    lightboxMediaContainer.style.transform = `translateX(-${lightboxIndex * itemWidth}px)`;

    if (lightboxDots) {
      lightboxDots.forEach((dot, i) => dot.classList.toggle('is-active', i === lightboxIndex));
    }
    if (lightboxPrevButton && lightboxNextButton) {
      lightboxPrevButton.disabled = lightboxIndex === 0;
      lightboxNextButton.disabled = lightboxIndex === allMediaItems.length - 1;
    }
  }

  /**
   * Ouvre la lightbox en synchronisant l'index
   */
  function openLightbox() {
    if (!lightbox) return;
    lightboxIndex = currentIndex;
    lightbox.classList.add('is-active');
    document.body.classList.add('lightbox-active');
    updateLightboxCarousel();
  }

  /**
   * Ferme la lightbox
   */
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-active');
    document.body.classList.remove('lightbox-active');
  }

  /**
   * Active le zoom sur desktop
   */
  function activateZoom() {
    if (window.innerWidth < 768 || !currentMainImageElement) return;

    mainImageWrapper.classList.add('zoom-active');
    allMediaItems[currentIndex].classList.add('zoom-target');
    isZoomActive = true;

    mainImageWrapper.addEventListener('mousemove', handleZoomMouseMove);
    mainImageWrapper.addEventListener('mouseleave', handleZoomMouseLeave);

    currentMainImageElement.style.transformOrigin = 'center center';
  }

  /**
   * Désactive le zoom actif
   */
  function deactivateZoom() {
    mainImageWrapper.classList.remove('zoom-active');
    allMediaItems[currentIndex].classList.remove('zoom-target');
    isZoomActive = false;

    mainImageWrapper.removeEventListener('mousemove', handleZoomMouseMove);
    mainImageWrapper.removeEventListener('mouseleave', handleZoomMouseLeave);

    if (currentMainImageElement) {
      currentMainImageElement.style.transformOrigin = '';
    }
  }

  /**
   * Gestion du mouvement de la souris pour zoom
   */
  function handleZoomMouseMove(e) {
    if (!isZoomActive || !currentMainImageElement) return;

    const rect = currentMainImageElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    currentMainImageElement.style.transformOrigin = `${xPercent}% ${yPercent}%`;
  }

  /**
   * Sortie du zoom quand la souris quitte l'image
   */
  function handleZoomMouseLeave() {
    if (isZoomActive) {
      deactivateZoom();
    }
  }

  // Événements boutons prochain/précédent avec désactivation du zoom
  if (nextButton && prevButton) {
    nextButton.addEventListener('click', () => {
      if (currentIndex < allMediaItems.length - 1) {
        if (isZoomActive) deactivateZoom();
        currentIndex++;
        updateMainCarousel();
      }
    });

    prevButton.addEventListener('click', () => {
      if (currentIndex > 0) {
        if (isZoomActive) deactivateZoom();
        currentIndex--;
        updateMainCarousel();
      }
    });
  }

  // Clic sur dots (pagination)
  dots.forEach((dot, i) =>
    dot.addEventListener('click', () => {
      if (isZoomActive) deactivateZoom();
      currentIndex = i;
      updateMainCarousel();
    })
  );

  // Clic sur miniatures
  thumbnails.forEach((thumb, i) =>
    thumb.addEventListener('click', () => {
      if (isZoomActive) deactivateZoom();
      currentIndex = i;
      updateMainCarousel();
    })
  );

  // Bouton zoom (desktop/mobile)
  if (zoomButton) {
    zoomButton.addEventListener('click', (e) => {
      e.stopPropagation();

      if (window.innerWidth < 768) {
        openLightbox();
      } else {
        if (isZoomActive) {
          deactivateZoom();
        } else {
          activateZoom();
        }
      }
    });
  }

  // Clic sur wrapper désactive le zoom (desktop)
  if (mainImageWrapper) {
    mainImageWrapper.addEventListener('click', () => {
      if (window.innerWidth >= 768 && isZoomActive) {
        deactivateZoom();
      }
    });
  }

  // Gestion lightbox : navigation et fermeture
  if (lightbox) {
    lightboxCloseButton.addEventListener('click', closeLightbox);

    lightboxNextButton.addEventListener('click', () => {
      if (lightboxIndex < allMediaItems.length - 1) {
        lightboxIndex++;
        updateLightboxCarousel();
      }
    });

    lightboxPrevButton.addEventListener('click', () => {
      if (lightboxIndex > 0) {
        lightboxIndex--;
        updateLightboxCarousel();
      }
    });

    if (lightboxDots) {
      lightboxDots.forEach((dot, i) =>
        dot.addEventListener('click', () => {
          lightboxIndex = i;
          updateLightboxCarousel();
        })
      );
    }
  }

  /**
   * Gestion des événements tactiles swipe (desktop & mobile)
   * Désactive le zoom pour ne pas interférer
   */
  function handleSwipe(target) {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
      if (target === 'main' && currentIndex < allMediaItems.length - 1) currentIndex++;
      if (target === 'lightbox' && lightboxIndex < allMediaItems.length - 1) lightboxIndex++;
    }
    if (touchEndX > touchStartX + swipeThreshold) {
      if (target === 'main' && currentIndex > 0) currentIndex--;
      if (target === 'lightbox' && lightboxIndex > 0) lightboxIndex--;
    }
    if (target === 'main') {
      if (isZoomActive) deactivateZoom();
      updateMainCarousel();
    }
    if (target === 'lightbox') updateLightboxCarousel();
  }

  // Swipe principal sur desktop/mobile gallery
  if (mainImageWrapper) {
    mainImageWrapper.addEventListener(
      'touchstart',
      (e) => {
        if (window.innerWidth >= 768 && isZoomActive) return;
        touchStartX = e.changedTouches[0].screenX;
        isSwiping = true;
        mediaContainer.style.transition = 'none';
      },
      { passive: true }
    );

    mainImageWrapper.addEventListener(
      'touchmove',
      (e) => {
        if (!isSwiping || (window.innerWidth >= 768 && isZoomActive)) return;
        const itemWidth = allMediaItems[0].offsetWidth;
        const moveX = e.changedTouches[0].screenX;
        const diff = moveX - touchStartX;
        mediaContainer.style.transform = `translateX(-${currentIndex * itemWidth - diff}px)`;
      },
      { passive: true }
    );

    mainImageWrapper.addEventListener(
      'touchend',
      (e) => {
        if (window.innerWidth >= 768 && isZoomActive) return;
        if (!isSwiping) return;
        isSwiping = false;
        touchEndX = e.changedTouches[0].screenX;
        mediaContainer.style.transition = 'transform 0.4s cubic-bezier(0.645, 0.045, 0.355, 1)';
        handleSwipe('main');
      },
      { passive: true }
    );
  }

  // Swipe lightbox mobile
  if (lightboxContent) {
    lightboxContent.addEventListener(
      'touchstart',
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
        lightboxMediaContainer.style.transition = 'none';
      },
      { passive: true }
    );

    lightboxContent.addEventListener(
      'touchmove',
      (e) => {
        const itemWidth = lightbox.offsetWidth;
        const moveX = e.changedTouches[0].screenX;
        const diff = moveX - touchStartX;
        lightboxMediaContainer.style.transform = `translateX(-${lightboxIndex * itemWidth - diff}px)`;
      },
      { passive: true }
    );

    lightboxContent.addEventListener(
      'touchend',
      (e) => {
        touchEndX = e.changedTouches[0].screenX;
        lightboxMediaContainer.style.transition = 'transform 0.3s ease';
        handleSwipe('lightbox');
      },
      { passive: true }
    );
  }

  // Initialisation du carousel au chargement
  if (allMediaItems.length > 0) {
    updateMainCarousel();
  }
});

/**
 * ==================================================================================
 * 12. SCRIPT WISHLIST GLOBAL (STOCKAGE LOCAL)
 * ==================================================================================
 */

(function () {
  const NAMESPACE = 'wishlist-sig-';
  const STORAGE_KEY = NAMESPACE + 'items';

  /**
   * Récupère la wishlist dans le localStorage
   * @returns {Array}
   */
  function getWishlist() {
    try {
      const items = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  /**
   * Sauvegarde la wishlist dans le localStorage
   * @param {Array} list 
   */
  function setWishlist(list) {
    const validItems = list.filter((item) => item && item.handle);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validItems));
    window.dispatchEvent(new CustomEvent(NAMESPACE + 'updated'));
  }

  /**
   * Recherche un item dans la wishlist
   * @param {string} handle 
   * @returns {object|undefined}
   */
  function findItemInWishlist(handle) {
    return getWishlist().find((item) => item.handle === handle);
  }

  /**
   * Met à jour le compteur de wishlist et l'état des icônes
   */
  function updateWishlistCounter() {
    const wishlist = getWishlist();
    const count = wishlist.length;
    const counters = document.querySelectorAll('.wishlist-count-bubble');

    counters.forEach((counter) => {
      const span = counter.querySelector('span');
      if (span) {
        span.textContent = count;
      }
      counter.classList.toggle('hidden', count === 0);

      const wishlistLink = counter.closest('.header__icon--wishlist');
      if (wishlistLink) {
        wishlistLink.classList.toggle('wishlist-active', count > 0);
      }
    });
  }

  /**
   * Lie les événements sur les boutons wishlist
   */
  function bindWishlistButtons() {
    document.querySelectorAll('.wishlist-sig-btn').forEach((btn) => {
      const handle = btn.dataset.productHandle;
      if (!handle) return;

      btn.setAttribute('aria-pressed', findItemInWishlist(handle) ? 'true' : 'false');

      // Évite d'attacher plusieurs fois plusieurs écouteurs au même bouton
      if (btn.wishlistClickListener) return;

      btn.wishlistClickListener = function (e) {
        e.preventDefault();
        e.stopPropagation();

        const productHandle = this.dataset.productHandle;
        let wishlist = getWishlist();
        const itemExists = findItemInWishlist(productHandle);

        if (!itemExists) {
          wishlist.push({ handle: productHandle, quantity: 1, note: '' });
          this.classList.add(NAMESPACE + 'burst-active');
        } else {
          wishlist = wishlist.filter((item) => item.handle !== productHandle);
        }
        setWishlist(wishlist);
      };

      btn.addEventListener('click', btn.wishlistClickListener);
    });
  }

  /**
   * Initialisation
   */
  function init() {
    bindWishlistButtons();
    updateWishlistCounter();

    window.addEventListener(NAMESPACE + 'updated', () => {
      bindWishlistButtons();
      updateWishlistCounter();
    });

    document.addEventListener('shopify:section:load', bindWishlistButtons);

    // Ecoute les mises à jour AJAX sur la page (ex : recherche)
    document.addEventListener('remithi:content:updated', () => {
      console.log('Contenu mis à jour, ré-initialisation de la wishlist...');
      bindWishlistButtons();
      updateWishlistCounter();
    });

    // Animation d'effet "burst"
    document.body.addEventListener('animationend', (e) => {
      if (e.target.classList.contains(NAMESPACE + 'burst')) {
        e.target.parentElement.classList.remove(NAMESPACE + 'burst-active');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/**
 * ==================================================================================
 * 13. LOGIQUE DU HEADER DESKTOP (LARGE ÉCRAN > 990px)
 * ==================================================================================
 */

class DesktopHeader {
  constructor() {
    this.desktopDropdownToggles = document.querySelectorAll('.header-desktop-nav .nav-item.has-dropdown > a');
    this.desktopDrawer = document.getElementById('desktop-menu-drawer');
    this.desktopDrawerToggleButton = document.getElementById('desktop-menu-toggle');
    this.desktopDrawerCloseButton = document.getElementById('desktop-menu-close');
    this.desktopDrawerSubmenuToggles = document.querySelectorAll('#desktop-menu-drawer .nav-item.has-dropdown > a');

    this.init();
  }

  init() {
    // Toggle dropdown dans menu desktop
    this.desktopDropdownToggles.forEach((toggle) => {
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        this.toggleDropdown(toggle.parentElement);
      });
    });

    // Ouverture / fermeture tiroir drawer desktop
    if (this.desktopDrawer) {
      const overlay = this.desktopDrawer.querySelector('.mobile-menu-drawer__overlay');
      this.desktopDrawerToggleButton?.addEventListener('click', () => this.openDrawer());
      this.desktopDrawerCloseButton?.addEventListener('click', () => this.closeDrawer());
      overlay?.addEventListener('click', () => this.closeDrawer());
    }

    // Toggle sous-menus dans drawer
    this.desktopDrawerSubmenuToggles.forEach((toggle) => {
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        toggle.parentElement.classList.toggle('is-open');
      });
    });

    // Gestion clic extérieur et touche échap pour fermer dropdowns et drawer
    this.addGlobalListeners();
  }

  toggleDropdown(dropdownItem) {
    const wasOpen = dropdownItem.classList.contains('is-open');
    // Ferme tous les autres dropdown ouverts
    document.querySelectorAll('.header-desktop-nav .nav-item.is-open').forEach((item) => {
      item.classList.remove('is-open');
    });

    if (!wasOpen) {
      dropdownItem.classList.add('is-open');
    }
  }

  openDrawer() {
    this.desktopDrawer?.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  closeDrawer() {
    this.desktopDrawer?.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  addGlobalListeners() {
    document.addEventListener('click', (event) => {
      const openDropdown = document.querySelector('.header-desktop-nav .nav-item.is-open');
      if (openDropdown && !openDropdown.contains(event.target)) {
        this.toggleDropdown(openDropdown);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;

      const openDropdown = document.querySelector('.header-desktop-nav .nav-item.is-open');
      if (openDropdown) {
        this.toggleDropdown(openDropdown);
      }

      if (this.desktopDrawer?.classList.contains('is-open')) {
        this.closeDrawer();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.matchMedia('(min-width: 990px)').matches) {
    new DesktopHeader();
  }
});

