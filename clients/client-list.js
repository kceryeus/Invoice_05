/**
 * Client List Handler
 * Manages the client list functionality
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize client list components
  initClientList();
  initSearchAndFilters();
  initViewToggle();
  initDeleteModal();
  initPagination();
  
  // Call refresh to load initial data
  refreshClientList();
});

// Global variables for list state
let currentPage = 1;
const pageSize = 10;
let filteredClients = [];
let allClients = [];
let searchQuery = '';
let statusFilter = 'all';
let typeFilter = 'all';
let viewMode = 'grid';

/**
 * Fetch clients from Supabase
 */
async function fetchClientsFromSupabase() {
  try {
    const { data, error } = await window.supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return [];
    }
    console.log('Fetched clients from Supabase:', data);
    return data;
  } catch (err) {
    console.error('Unexpected error fetching clients:', err);
    return [];
  }
}

/**
 * Initialize the client list
 */
async function initClientList() {
  const clientListContainer = document.getElementById('client-list');
  if (!clientListContainer) return;

  // Fetch real data from Supabase
  allClients = await fetchClientsFromSupabase();
  refreshClientList();
}

/**
 * Initialize search and filter functionality
 */
function initSearchAndFilters() {
  const searchInput = document.getElementById('client-search');
  const statusFilterSelect = document.getElementById('status-filter');
  const typeFilterSelect = document.getElementById('type-filter');
  
  if (!searchInput || !statusFilterSelect || !typeFilterSelect) return;
  
  // Setup search debounce
  searchInput.addEventListener('input', window.appUtils.debounce(() => {
    searchQuery = searchInput.value.toLowerCase().trim();
    currentPage = 1; // Reset to first page on search
    refreshClientList();
  }, 300));
  
  // Setup status filter
  statusFilterSelect.addEventListener('change', () => {
    statusFilter = statusFilterSelect.value;
    currentPage = 1; // Reset to first page on filter change
    refreshClientList();
  });
  
  // Setup type filter
  typeFilterSelect.addEventListener('change', () => {
    typeFilter = typeFilterSelect.value;
    currentPage = 1; // Reset to first page on filter change
    refreshClientList();
  });
}

/**
 * Initialize view toggle (grid/list)
 */
function initViewToggle() {
  const gridViewBtn = document.getElementById('grid-view-btn');
  const listViewBtn = document.getElementById('list-view-btn');
  const clientList = document.getElementById('client-list');
  
  if (!gridViewBtn || !listViewBtn || !clientList) return;
  
  // Set initial view from localStorage or default to grid
  viewMode = localStorage.getItem('client-view-mode') || 'grid';
  updateViewMode(viewMode);
  
  // Grid view button
  gridViewBtn.addEventListener('click', () => {
    updateViewMode('grid');
  });
  
  // List view button
  listViewBtn.addEventListener('click', () => {
    updateViewMode('list');
  });
  
  // Helper to update view mode
  function updateViewMode(mode) {
    viewMode = mode;
    localStorage.setItem('client-view-mode', mode);
    
    // Update buttons
    gridViewBtn.classList.toggle('active', mode === 'grid');
    listViewBtn.classList.toggle('active', mode === 'list');
    
    // Update list class
    clientList.className = `client-list ${mode}-view`;
    
    // Refresh list to apply the new view
    refreshClientList();
  }
}

/**
 * Initialize delete confirmation modal
 */
function initDeleteModal() {
  const deleteModal = document.getElementById('delete-modal');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  const closeModalBtns = document.querySelectorAll('.close-modal');
  
  if (!deleteModal || !confirmDeleteBtn || !cancelDeleteBtn) return;
  
  let clientToDelete = null;
  
  // Setup delete client function for external access
  window.deleteClient = (clientId) => {
    clientToDelete = clientId;
    deleteModal.classList.add('active');
  };
  
  // Confirm delete button
  confirmDeleteBtn.addEventListener('click', () => {
    if (clientToDelete) {
      // Delete the client
      const success = removeClient(clientToDelete);
      if (success) {
        window.appUtils.showToast('Client deleted successfully', 'success');
        refreshClientList();
      } else {
        window.appUtils.showToast('Error deleting client', 'error');
      }
      clientToDelete = null;
    }
    deleteModal.classList.remove('active');
  });
  
  // Cancel delete button
  cancelDeleteBtn.addEventListener('click', () => {
    clientToDelete = null;
    deleteModal.classList.remove('active');
  });
  
  // Close modal buttons
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      clientToDelete = null;
      deleteModal.classList.remove('active');
    });
  });
}

/**
 * Initialize pagination controls
 */
function initPagination() {
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  
  if (!prevPageBtn || !nextPageBtn || !pageInfo) return;
  
  // Previous page button
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      refreshClientList();
    }
  });
  
  // Next page button
  nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredClients.length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      refreshClientList();
    }
  });
}

/**
 * Refresh the client list with current filters and pagination
 */
function refreshClientList() {
  const clientList = document.getElementById('client-list');
  const pageInfo = document.getElementById('page-info');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  if (!clientList) return;

  // Show loading state
  clientList.innerHTML = `
    <div class="loading-indicator">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Loading clients...</span>
    </div>
  `;

  // Apply filters
  filteredClients = allClients.filter(client => {
    // Status filter (if you have a status field)
    if (statusFilter !== 'all' && client.status !== statusFilter) {
      return false;
    }
    // Type filter (if you have a type field)
    if (typeFilter !== 'all' && client.client_type !== typeFilter) {
      return false;
    }
    // Search filter
    if (searchQuery) {
      const searchFields = [
        client.company_name,
        client.contact,
        client.email,
        client.customer_tax_id,
        client.billing_address,
        client.city
      ].filter(Boolean).map(field => field.toLowerCase());
      return searchFields.some(field => field.includes(searchQuery));
    }
    return true;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);

  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;

  // Get current page of clients
  const startIndex = (currentPage - 1) * pageSize;
  const currentPageClients = filteredClients.slice(startIndex, startIndex + pageSize);

  // Clear loading state
  clientList.innerHTML = '';

  // Show empty state if no clients
  if (currentPageClients.length === 0) {
    clientList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <h3>No clients found</h3>
        <p>Try adjusting your search or filters, or add a new client.</p>
      </div>
    `;
    return;
  }

  // Render clients
  currentPageClients.forEach(client => {
    const clientElement = document.createElement('div');
    clientElement.className = 'client-item';

    clientElement.innerHTML = `
      <div class="client-info">
        <span class="client-type">${client.company_name ? 'Business' : 'Individual'}</span>
        <h4>${client.company_name || client.contact || client.email}</h4>
        <p>${client.email || ''}</p>
        ${client.company_name ? `<p>${client.company_name}</p>` : ''}
        <div class="client-contact">
          ${client.telephone ? `<p><i class="fas fa-phone"></i> ${client.telephone}</p>` : ''}
        </div>
        <span class="status-btn">${client.status || 'Active'}</span>
      </div>
      <div class="client-actions">
        <button class="edit-btn" onclick="editClient('${client.customer_id}')" aria-label="Edit client">
          <i class="fas fa-edit"></i>
        </button>
        <button class="delete-btn" onclick="deleteClient('${client.customer_id}')" aria-label="Delete client">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    clientList.appendChild(clientElement);
  });

  console.log('Displayed clients:', currentPageClients);
}

// Make refresh function globally available
window.refreshClientList = refreshClientList;
