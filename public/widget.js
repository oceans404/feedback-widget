// Feedback Widget Implementation
(function (window, document) {
  'use strict';

  // Widget state
  const state = {
    config: null,
    isOpen: false,
    isSubmitting: false,
  };

  // Get server URL from script tag
  const getServerUrl = () => {
    const script =
      document.currentScript ||
      document.querySelector('script[src*="widget.js"]');
    return (
      script.getAttribute('data-server-url') ||
      'https://your-render-app.onrender.com'
    );
  };

  // DOM Elements
  let widgetContainer = null;
  let modalContainer = null;
  let form = null;

  // Initialize widget
  function init(siteId) {
    return new Promise((resolve, reject) => {
      console.log('Initializing widget with siteId:', siteId);
      // Load configuration from server
      fetch(`${getServerUrl()}/api/widget/${siteId}`)
        .then((response) => response.json())
        .then((data) => {
          console.log('Received widget configuration:', data);
          state.config = data.config;
          createWidgetElements();
          // Setup event listeners after elements are created
          setupEventListeners();
          resolve(state.config);
        })
        .catch((error) => {
          console.error('Failed to load widget configuration:', error);
          reject(error);
        });
    });
  }

  // Create widget elements
  function createWidgetElements() {
    // Create container
    const container = document.createElement('div');
    container.id = 'feedback-widget-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '10000';

    // Create button
    const button = document.createElement('button');
    button.id = 'feedback-widget-button';
    button.textContent = state.config.buttonText || 'Feedback';
    button.style.padding = '10px 20px';
    button.style.borderRadius = '5px';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.style.fontWeight = '500';
    button.style.transition = 'all 0.2s ease';
    button.style.backgroundColor = state.config.highlightColor || 'black';
    button.style.color = 'white';

    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.id = 'feedback-widget-modal';
    modalContainer.style.display = 'none';
    modalContainer.style.position = 'fixed';
    modalContainer.style.zIndex = '10001';
    modalContainer.style.padding = '20px';
    modalContainer.style.borderRadius = '8px';
    modalContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    modalContainer.style.backgroundColor = 'white';
    modalContainer.style.width = '400px';
    modalContainer.style.maxWidth = '90vw';
    modalContainer.style.right = '20px';
    modalContainer.style.bottom = '20px';
    modalContainer.style.top = 'auto';
    modalContainer.style.left = 'auto';
    modalContainer.style.maxHeight = '80vh';
    modalContainer.style.overflowY = 'auto';

    // Add mobile styles
    const mobileStyles = `
      @media screen and (max-width: 768px) {
        #feedback-widget-modal {
          position: fixed !important;
          left: 50% !important;
          right: auto !important;
          bottom: auto !important;
          top: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 90% !important;
          max-width: 350px !important;
          margin: 0 !important;
          max-height: 90vh !important;
        }
      }
    `;
    const styleSheet = document.createElement('style');
    styleSheet.textContent = mobileStyles;
    document.head.appendChild(styleSheet);

    // Create form
    const form = document.createElement('form');
    form.id = 'feedback-form';
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = '15px';

    // Create title
    const title = document.createElement('h2');
    title.textContent = state.config.title || 'Send Feedback';
    title.style.margin = '0 0 20px 0';
    title.style.fontSize = '20px';
    title.style.fontWeight = '600';

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '5px 10px';
    closeButton.style.color = '#666';
    closeButton.style.transition = 'color 0.2s ease';
    closeButton.addEventListener('mouseover', () => {
      closeButton.style.color = '#000';
    });
    closeButton.addEventListener('mouseout', () => {
      closeButton.style.color = '#666';
    });
    closeButton.addEventListener('click', closeModal);

    // Create rating section if enabled
    if (state.config.showRating) {
      const ratingSection = document.createElement('div');
      ratingSection.style.marginBottom = '15px';

      const ratingQuestion = document.createElement('p');
      ratingQuestion.textContent =
        state.config.ratingQuestion || 'Was this page helpful?';
      ratingQuestion.style.margin = '0 0 10px 0';
      ratingQuestion.style.fontSize = '14px';

      const ratingButtons = document.createElement('div');
      ratingButtons.style.display = 'flex';
      ratingButtons.style.gap = '10px';

      // Add hover and selected states for rating buttons
      const highlightColor = state.config.highlightColor || 'black';
      const ratingButtonStyles = `
        .rating-btn {
          padding: 12px 24px;
          border: 2px solid #ddd;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 20px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 80px;
          user-select: none;
        }
        .rating-btn:hover {
          border-color: ${highlightColor};
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .rating-btn.selected {
          border-color: ${highlightColor} !important;
          background: white !important;
          color: ${highlightColor} !important;
          transform: translateY(-2px) !important;
          font-weight: bold !important;
          font-size: 22px !important;
          padding: 14px 28px !important;
        }
      `;

      const styleSheet = document.createElement('style');
      styleSheet.textContent = ratingButtonStyles;
      document.head.appendChild(styleSheet);

      // Create rating buttons
      const negativeBtn = document.createElement('button');
      negativeBtn.type = 'button';
      negativeBtn.className = 'rating-btn';
      negativeBtn.dataset.rating = 'negative';
      negativeBtn.textContent = '👎';

      const positiveBtn = document.createElement('button');
      positiveBtn.type = 'button';
      positiveBtn.className = 'rating-btn';
      positiveBtn.dataset.rating = 'positive';
      positiveBtn.textContent = '👍';

      ratingButtons.appendChild(negativeBtn);
      ratingButtons.appendChild(positiveBtn);
      ratingSection.appendChild(ratingQuestion);
      ratingSection.appendChild(ratingButtons);
      form.appendChild(ratingSection);
    }

    // Create message textarea
    const messageTextarea = document.createElement('textarea');
    messageTextarea.name = 'message';
    messageTextarea.required = true;
    messageTextarea.placeholder =
      state.config.messagePlaceholder || 'Tell us what you think...';
    messageTextarea.style.padding = '12px';
    messageTextarea.style.border = '1px solid #ddd';
    messageTextarea.style.borderRadius = '4px';
    messageTextarea.style.resize = 'vertical';
    messageTextarea.style.minHeight = '100px';
    messageTextarea.style.fontFamily = 'inherit';
    messageTextarea.style.fontSize = '14px';
    messageTextarea.style.width = 'calc(100% - 16px)';
    messageTextarea.style.boxSizing = 'border-box';
    messageTextarea.style.transition = 'border-color 0.2s ease';
    messageTextarea.addEventListener('focus', () => {
      messageTextarea.style.borderColor =
        state.config.highlightColor || 'black';
    });
    messageTextarea.addEventListener('blur', () => {
      messageTextarea.style.borderColor = '#ddd';
    });

    // Create email input if required
    let emailInput;
    if (state.config.requireEmail) {
      emailInput = document.createElement('input');
      emailInput.type = 'email';
      emailInput.name = 'email';
      emailInput.required = true;
      emailInput.placeholder =
        state.config.emailPlaceholder || 'your@email.com';
      emailInput.style.padding = '12px';
      emailInput.style.border = '1px solid #ddd';
      emailInput.style.borderRadius = '4px';
      emailInput.style.fontFamily = 'inherit';
      emailInput.style.fontSize = '14px';
      emailInput.style.width = 'calc(100% - 16px)';
      emailInput.style.boxSizing = 'border-box';
    }

    // Create submit button
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = state.config.submitButtonText || 'Submit';
    submitButton.style.padding = '12px 24px';
    submitButton.style.backgroundColor =
      state.config.highlightColor || '#0070f4';
    submitButton.style.color = 'white';
    submitButton.style.border = 'none';
    submitButton.style.borderRadius = '4px';
    submitButton.style.cursor = 'pointer';
    submitButton.style.fontSize = '14px';
    submitButton.style.fontWeight = '500';
    submitButton.style.transition = 'background-color 0.2s ease';
    submitButton.style.minWidth = '120px';

    // Add hover effect for submit button
    submitButton.addEventListener('mouseover', () => {
      submitButton.style.backgroundColor = adjustColor(
        state.config.highlightColor || '#0070f4',
        -20
      );
    });
    submitButton.addEventListener('mouseout', () => {
      submitButton.style.backgroundColor =
        state.config.highlightColor || '#0070f4';
    });

    // Assemble form
    form.appendChild(messageTextarea);
    if (emailInput) form.appendChild(emailInput);

    const formActions = document.createElement('div');
    formActions.style.display = 'flex';
    formActions.style.justifyContent = 'flex-end';
    formActions.style.marginTop = '20px';
    formActions.appendChild(submitButton);
    form.appendChild(formActions);

    // Assemble modal
    modalContainer.appendChild(title);
    modalContainer.appendChild(closeButton);
    modalContainer.appendChild(form);

    // Add elements to page
    document.body.appendChild(container);
    container.appendChild(button);
    document.body.appendChild(modalContainer);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'feedback-widget-overlay';
    overlay.style.display = 'none';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '9999';
    document.body.appendChild(overlay);

    // Store references
    state.button = button;
    state.modalContainer = modalContainer;
    state.form = form;
    state.overlay = overlay;
  }

  // Setup event listeners
  function setupEventListeners() {
    // Open modal
    const button = document.getElementById('feedback-widget-button');
    if (button) {
      button.addEventListener('click', openModal);
    }

    // Handle form submission
    if (state.form) {
      state.form.addEventListener('submit', handleSubmit);
    }

    // Handle rating buttons
    const ratingButtons = document.querySelectorAll('.rating-btn');
    if (ratingButtons.length > 0) {
      ratingButtons.forEach((button) => {
        button.addEventListener('click', () => {
          // Remove selected class and data-selected from all buttons
          ratingButtons.forEach((btn) => {
            btn.classList.remove('selected');
            delete btn.dataset.selected;
          });
          // Add selected class and data-selected to clicked button
          button.classList.add('selected');
          button.dataset.selected = 'true';
        });
      });
    }

    // Handle overlay click
    if (state.overlay) {
      state.overlay.addEventListener('click', closeModal);
    }
  }

  // Open modal
  function openModal() {
    if (!state.modalContainer || !state.overlay) {
      console.error('Modal elements not initialized');
      return;
    }
    state.isOpen = true;
    state.overlay.style.display = 'block';
    state.modalContainer.style.display = 'block';
    // Hide the feedback button container
    const container = document.getElementById('feedback-widget-container');
    if (container) {
      container.style.display = 'none';
    }
  }

  // Close modal
  function closeModal() {
    if (!state.modalContainer || !state.overlay) {
      console.error('Modal elements not initialized');
      return;
    }
    state.isOpen = false;
    state.overlay.style.display = 'none';
    state.modalContainer.style.display = 'none';
    // Show the feedback button container
    const container = document.getElementById('feedback-widget-container');
    if (container) {
      container.style.display = 'block';
    }
    if (state.form) {
      state.form.reset();
      // Reset rating selection
      const ratingButtons = document.querySelectorAll('.rating-btn');
      ratingButtons.forEach((btn) => btn.classList.remove('selected'));
    }
  }

  // Helper function to adjust color brightness
  function adjustColor(color, amount) {
    return color
      .replace(/^#/, '')
      .replace(/../g, (color) =>
        (
          '0' +
          Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)
        ).substr(-2)
      );
  }

  // Handle form submission
  async function handleSubmit(event) {
    event.preventDefault();

    if (state.isSubmitting) return;
    state.isSubmitting = true;

    try {
      const formData = new FormData(event.target);
      const selectedRating = document.querySelector(
        '.rating-btn[data-selected="true"]'
      )?.dataset.rating;
      const message = formData.get('message')?.trim();

      // Validate required fields
      if (!message) {
        alert('Please enter your feedback message');
        state.isSubmitting = false;
        return;
      }

      // Format the data according to server expectations
      const feedbackData = {
        siteId: state.config.siteId,
        rating: selectedRating || '',
        message: message,
        email: formData.get('email') || '',
        metadata: {
          url: window.location.href,
          browser: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          userAgent: navigator.userAgent,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          referrer: document.referrer,
        },
      };

      const response = await fetch(`${getServerUrl()}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      const result = await response.json();
      console.log('Feedback submitted successfully:', result);

      // Show success message
      if (state.form) {
        state.form.innerHTML = `<div class="success-message">${state.config.successMessage}</div>`;
        setTimeout(closeModal, 2000);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback: ' + error.message);
    } finally {
      state.isSubmitting = false;
    }
  }

  // Public API
  window.embed_feedback_widget = function (command, ...args) {
    console.log(
      'embed_feedback_widget called with command:',
      command,
      'args:',
      args
    );
    switch (command) {
      case 'init':
        return init(args[0]);
      case 'open':
        if (state.config) {
          console.log('Opening modal via embed_feedback_widget command');
          openModal();
        } else {
          console.warn('Cannot open modal: widget not initialized');
        }
        break;
      case 'close':
        if (state.config) {
          console.log('Closing modal via embed_feedback_widget command');
          closeModal();
        } else {
          console.warn('Cannot close modal: widget not initialized');
        }
        break;
      case 'getHighlightColor':
        return state.config?.highlightColor || 'black';
      default:
        console.warn('Unknown command:', command);
    }
  };

  console.log('Widget script initialization complete');
})(window, document);
