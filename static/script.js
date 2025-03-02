document.addEventListener("DOMContentLoaded", function () {
    fetch("/api/history")
        .then(response => response.json())
        .then(data => {
            let historyList = document.getElementById("history-list");
            historyList.innerHTML = "";
            data.forEach(query => {
                let li = document.createElement("li");
                li.textContent = `${query[0]} - ${query[1]}`;
                historyList.appendChild(li);
            });
        })
        .catch(error => console.error("Error fetching history:", error));
});

document.addEventListener('DOMContentLoaded', function() {
    console.log("Script loaded and running");
    
    const searchInput = document.getElementById('searchInput');
    const searchSuggestions = document.getElementById('searchSuggestions');
    let selectAllCheckbox = document.getElementById('selectAll');
    const industryCheckboxes = document.querySelectorAll('input[name="industry"]');
    const mainIndustryCheckboxes = document.querySelectorAll('.main-industry-checkbox');
    const subIndustryCheckboxes = document.querySelectorAll('.sub-industry-checkbox');
    const industryToggles = document.querySelectorAll('.industry-toggle');
    
    console.log("Search input:", searchInput);
    console.log("Select all checkbox:", selectAllCheckbox);
    console.log("Industry checkboxes:", industryCheckboxes.length);
    console.log("Main industry checkboxes:", mainIndustryCheckboxes.length);
    console.log("Sub industry checkboxes:", subIndustryCheckboxes.length);
    
    // Initialize checkboxes state
    initializeCheckboxes();
    
    // Initialize industry toggles
    initializeIndustryToggles();
    
    // Add focus animation to search input
    searchInput.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    searchInput.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
    });
    
    // Search input event
    searchInput.addEventListener('input', function() {
        const searchQuery = this.value.trim();
        
        // Show search suggestions
        if (searchQuery.length > 0) {
            showSearchSuggestions(searchQuery);
        } else {
            hideSearchSuggestions();
        }
    });
    
    // Search button click event
    document.getElementById('searchButton')?.addEventListener('click', function() {
        const searchQuery = searchInput.value.trim();
        if (searchQuery) {
            performSearch(searchQuery);
        }
    });
    
    // Search input keydown event for Enter key
    searchInput?.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const searchQuery = this.value.trim();
            if (searchQuery) {
                // Perform search
                performSearch(searchQuery);
            }
        }
    });
    
    // Select all checkbox event - IMPROVED BEHAVIOR
    selectAllCheckbox?.addEventListener('change', function() {
        // Set all industry checkboxes to match the select all checkbox state
        const newState = this.checked;
        
        // Set all industry checkboxes to the new state
        industryCheckboxes.forEach(cb => {
            cb.checked = newState;
        });
        
        // Update search results
        updateResults();
    });
    
    // Individual industry checkbox events
    industryCheckboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            // Only update the select all checkbox state, don't trigger any automatic selection
            const allChecked = Array.from(industryCheckboxes).every(cb => cb.checked);
            const someChecked = Array.from(industryCheckboxes).some(cb => cb.checked);
            
            selectAllCheckbox.checked = allChecked;
            selectAllCheckbox.indeterminate = !allChecked && someChecked;
            
            // If this is a main industry checkbox, update its sub-industries
            if (this.classList.contains('main-industry-checkbox')) {
                const industry = this.dataset.industry;
                const subCheckboxes = document.querySelectorAll(`.sub-industry-checkbox[data-parent="${industry}"]`);
                subCheckboxes.forEach(subCb => {
                    subCb.checked = this.checked;
                });
            }
            
            // If this is a sub-industry checkbox, update its parent industry
            if (this.classList.contains('sub-industry-checkbox')) {
                const parentIndustry = this.dataset.parent;
                const parentCheckbox = document.querySelector(`.main-industry-checkbox[data-industry="${parentIndustry}"]`);
                const siblingCheckboxes = document.querySelectorAll(`.sub-industry-checkbox[data-parent="${parentIndustry}"]`);
                
                const allSiblingsChecked = Array.from(siblingCheckboxes).every(cb => cb.checked);
                const someSiblingsChecked = Array.from(siblingCheckboxes).some(cb => cb.checked);
                
                if (parentCheckbox) {
                    parentCheckbox.checked = allSiblingsChecked;
                    parentCheckbox.indeterminate = !allSiblingsChecked && someSiblingsChecked;
                }
            }
            
            // Update results
            updateResults();
        });
    });
    
    // Initialize industry toggles
    function initializeIndustryToggles() {
        // Add click event to industry toggles
        industryToggles.forEach(toggle => {
            const mainCheckboxContainer = toggle.closest('.industry-main-checkbox');
            const subIndustriesContainer = mainCheckboxContainer.nextElementSibling;
            
            // Initially show sub-industries
            mainCheckboxContainer.classList.add('expanded');
            
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Toggle expanded class
                mainCheckboxContainer.classList.toggle('expanded');
                
                // Toggle visibility of sub-industries
                if (subIndustriesContainer) {
                    if (mainCheckboxContainer.classList.contains('expanded')) {
                        subIndustriesContainer.style.display = 'flex';
                    } else {
                        subIndustriesContainer.style.display = 'none';
                    }
                }
            });
        });
    }
    
    // Click outside search suggestions to hide them
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
            hideSearchSuggestions();
        }
    });
    
    // Setup smooth page transitions
    setupSmoothPageTransitions();
    
    // Initialize checkboxes state
    function initializeCheckboxes() {
        const params = new URLSearchParams(window.location.search);
        const selectedIndustries = params.getAll('industries');
        
        if (selectedIndustries.length === 0) {
            // Don't default to all selected - leave all unchecked
            selectAllCheckbox.checked = false;
            industryCheckboxes.forEach(cb => {
                cb.checked = false;
            });
        } else {
            // Set based on URL parameters
            industryCheckboxes.forEach(cb => {
                cb.checked = selectedIndustries.includes(cb.value);
            });
            
            // Update main industry checkboxes based on their sub-industries
            mainIndustryCheckboxes.forEach(mainCb => {
                const industry = mainCb.dataset.industry;
                const subCheckboxes = document.querySelectorAll(`.sub-industry-checkbox[data-parent="${industry}"]`);
                
                if (subCheckboxes.length > 0) {
                    const allSubChecked = Array.from(subCheckboxes).every(cb => cb.checked);
                    const someSubChecked = Array.from(subCheckboxes).some(cb => cb.checked);
                    
                    mainCb.checked = allSubChecked;
                    mainCb.indeterminate = !allSubChecked && someSubChecked;
                }
            });
            
            updateSelectAllState();
        }
        
        // Initialize sub-industry containers
        document.querySelectorAll('.sub-industries-container').forEach(container => {
            container.style.display = 'flex'; // Initially show all sub-industries
        });
    }
    
    // Update select all checkbox state
    function updateSelectAllState() {
        const allChecked = Array.from(industryCheckboxes).every(cb => cb.checked);
        const someChecked = Array.from(industryCheckboxes).some(cb => cb.checked);
        
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = !allChecked && someChecked;
        
        // Don't automatically update results or change checkbox states here
    }
    
    // Show search suggestions
    function showSearchSuggestions(query) {
        // 清空并激活搜索建议容器
        searchSuggestions.innerHTML = '';
        searchSuggestions.classList.add('active');
        
        // 创建搜索建议项
        const searchItem = document.createElement('div');
        searchItem.className = 'suggestion-item';
        
        // 在搜索阶段只显示搜索选项，不显示添加按钮
        searchItem.innerHTML = `
            <span><i class="fas fa-search"></i> Search for: "${query}"</span>
        `;
        
        // 搜索点击事件
        searchItem.addEventListener('click', function() {
            hideSearchSuggestions();
            performSearch(query);
        });
        
        searchSuggestions.appendChild(searchItem);
        
        // 确保搜索建议在视口内可见
        const rect = searchSuggestions.getBoundingClientRect();
        if (rect.bottom > window.innerHeight) {
            searchSuggestions.style.maxHeight = `${window.innerHeight - rect.top - 20}px`;
        }
    }
    
    // Hide search suggestions
    function hideSearchSuggestions() {
        searchSuggestions.classList.remove('active');
        searchSuggestions.innerHTML = ''; // 清空内容
    }
    
    // Perform search
    function performSearch(query) {
        const params = new URLSearchParams(window.location.search);
        
        // Clear previous search and industries
        params.delete('search');
        params.delete('industries');
        
        // Set the search query
        params.set('search', query);
        
        // Keep username parameter
        const username = new URLSearchParams(window.location.search).get('username');
        if (username) {
            params.set('username', username);
        }
        
        // Show loading indicator
        showLoading();
        
        // Redirect to search results
        window.location.href = `/dashboard?${params.toString()}`;
    }
    
    // Update results based on selected industries
    function updateResults() {
        const params = new URLSearchParams(window.location.search);
        params.delete('industries');
        
        // Get selected industries
        const selectedIndustries = Array.from(industryCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        
        // Add selected industries to parameters
        selectedIndustries.forEach(industry => {
            params.append('industries', industry);
        });
        
        // Keep search query and username
        const searchQuery = params.get('search');
        if (searchQuery) {
            params.set('search', searchQuery);
        } else {
            params.delete('search');
        }
        
        const username = new URLSearchParams(window.location.search).get('username');
        if (username) {
            params.set('username', username);
        }
        
        // Show loading indicator
        showLoading();
        
        // Redirect to updated results
        window.location.href = `/dashboard?${params.toString()}`;
    }
    
    // Show loading indicator
    function showLoading() {
        // Add loading class to body
        document.body.classList.add('loading');
        
        // Add loading styles if they don't exist
        if (!document.getElementById('loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                body.loading::after {
                    content: '';
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.7);
                    z-index: 9999;
                }
                
                body.loading::before {
                    content: '';
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 40px;
                    height: 40px;
                    border: 4px solid var(--primary-light);
                    border-top: 4px solid var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    z-index: 10000;
                }
                
                @keyframes spin {
                    0% { transform: translate(-50%, -50%) rotate(0deg); }
                    100% { transform: translate(-50%, -50%) rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Add industry function
    window.addIndustry = function(industry) {
        const username = new URLSearchParams(window.location.search).get('username');
        
        // Check if industry already exists
        const existingIndustries = Array.from(document.querySelectorAll('.industry-checkbox'))
            .map(label => label.textContent.trim().toLowerCase());
        
        if (existingIndustries.includes(industry.toLowerCase())) {
            // Industry already exists, alert the user
            alert(`"${industry}" is already in your tracked industries.`);
            
            // Select the industry
            const checkbox = Array.from(industryCheckboxes)
                .find(cb => cb.value.toLowerCase() === industry.toLowerCase());
            
            if (checkbox) {
                checkbox.checked = true;
                updateSelectAllState();
                updateResults();
            }
            return;
        }
        
        // Show loading indicator
        showLoading();
        
        // Add new industry
        fetch(`/add_industry?username=${username}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `industry=${encodeURIComponent(industry)}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Refresh page to show new industry with only this industry selected
                const params = new URLSearchParams(window.location.search);
                params.delete('industries');
                params.delete('search');
                params.append('industries', industry);
                window.location.href = `/dashboard?${params.toString()}`;
            } else {
                document.body.classList.remove('loading');
                alert(data.error);
            }
        })
        .catch(error => {
            document.body.classList.remove('loading');
            console.error('Error:', error);
        });
    };
    
    // Delete industry event handlers
    document.querySelectorAll('.delete-industry').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const industry = this.dataset.industry;
            const username = new URLSearchParams(window.location.search).get('username');
            
            if (confirm(`Are you sure you want to remove "${industry}" from your tracked industries?`)) {
                deleteIndustry(industry, username);
            }
        });
    });
    
    // Delete industry function
    function deleteIndustry(industry, username) {
        // Show loading indicator
        showLoading();
        
        fetch(`/delete_industry?username=${username}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `industry=${encodeURIComponent(industry)}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Refresh page to update industry list
                location.reload();
            } else {
                document.body.classList.remove('loading');
                alert(data.error);
            }
        })
        .catch(error => {
            document.body.classList.remove('loading');
            console.error('Error:', error);
        });
    }

    // Add random but consistent colors for topics
    const topicColors = {};
    const hueStep = 360 / (document.querySelectorAll('.topic-tag').length || 10);
    let hue = 0;

    document.querySelectorAll('.topic-tag').forEach(tag => {
        const topic = tag.textContent.trim();
        if (!topicColors[topic]) {
            topicColors[topic] = `hsl(${hue}, 85%, 96%)`;
            hue += hueStep;
        }
        tag.style.backgroundColor = topicColors[topic];
    });
    
    // 添加一个立即执行函数，确保在页面加载后处理搜索结果
    (function() {
        // 等待页面完全加载
        window.addEventListener('load', function() {
            console.log("Window loaded, processing search results");
            
            // 检查是否是搜索结果页面
            const searchQuery = new URLSearchParams(window.location.search).get('search');
            if (searchQuery) {
                console.log("Search results page detected");
                
                // 创建搜索结果行业标签容器
                createSearchResultsUI(searchQuery);
            }
        });
        
        // 创建搜索结果UI
        function createSearchResultsUI(searchQuery) {
            // 获取新闻部分的标题元素
            const newsTitle = document.querySelector('.news-section h2');
            if (!newsTitle) return;
            
            // 获取当前用户已有的行业
            const existingIndustries = Array.from(document.querySelectorAll('.industry-checkbox'))
                .map(label => {
                    const industryName = label.querySelector('.industry-name');
                    return industryName ? industryName.textContent.trim() : '';
                })
                .filter(name => name !== '');
            
            console.log("Existing industries:", existingIndustries);
            
            // 检查搜索的行业是否已存在
            const isExisting = existingIndustries.some(industry => 
                industry.toLowerCase() === searchQuery.toLowerCase());
            
            // 创建搜索结果UI
            const searchResultsUI = document.createElement('div');
            searchResultsUI.className = 'search-results-ui';
            searchResultsUI.innerHTML = `
                <div class="search-query-info">
                    <span>Search results for: <strong>"${searchQuery}"</strong></span>
                    ${isExisting ? 
                        `<button class="remove-industry-btn" title="Remove from tracked industries">
                            <i class="fas fa-times-circle"></i> Remove from tracked
                        </button>` : 
                        `<button class="add-industry-btn" title="Add to tracked industries">
                            <i class="fas fa-plus-circle"></i> Add to tracked
                        </button>`
                    }
                </div>
            `;
            
            // 插入到新闻标题后面
            newsTitle.insertAdjacentElement('afterend', searchResultsUI);
            
            // 添加事件监听器
            if (isExisting) {
                // 删除行业
                searchResultsUI.querySelector('.remove-industry-btn').addEventListener('click', function() {
                    if (confirm(`Are you sure you want to remove "${searchQuery}" from your tracked industries?`)) {
                        const username = new URLSearchParams(window.location.search).get('username');
                        deleteIndustry(searchQuery, username);
                    }
                });
            } else {
                // 添加行业
                searchResultsUI.querySelector('.add-industry-btn').addEventListener('click', function() {
                    addIndustry(searchQuery);
                });
            }
        }
    })();
});

// Setup smooth page transitions between dashboard and companies pages
function setupSmoothPageTransitions() {
    // Get navigation links
    const navLinks = document.querySelectorAll('.main-nav a');
    
    // Add click event listeners to navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the target URL
            const targetUrl = this.getAttribute('href');
            
            // Save current page state
            saveCurrentPageState();
            
            // Load the target page content
            loadPageContent(targetUrl);
            
            // Update active navigation link
            updateActiveNavLink(this);
        });
    });
}

// Save the current page state
function saveCurrentPageState() {
    const currentPath = window.location.pathname;
    
    if (currentPath === '/dashboard') {
        // Save dashboard state
        const searchQuery = document.getElementById('searchInput')?.value || '';
        const selectedIndustries = Array.from(document.querySelectorAll('input[name="industry"]:checked'))
            .map(cb => cb.value);
        
        // Store in sessionStorage
        sessionStorage.setItem('dashboard_search', searchQuery);
        sessionStorage.setItem('dashboard_industries', JSON.stringify(selectedIndustries));
        console.log('Saved dashboard state:', { searchQuery, selectedIndustries });
    } 
    else if (currentPath === '/companies') {
        // Save companies state
        const searchQuery = document.getElementById('companySearchInput')?.value || '';
        const riskFilter = document.querySelector('input[name="risk-filter"]:checked')?.value || '';
        
        // Store in sessionStorage
        sessionStorage.setItem('companies_search', searchQuery);
        sessionStorage.setItem('companies_risk_filter', riskFilter);
        console.log('Saved companies state:', { searchQuery, riskFilter });
    }
}

// Load page content via AJAX
function loadPageContent(url) {
    // Show loading indicator
    showLoading();
    
    // Add a parameter to indicate this is an AJAX request
    const ajaxUrl = url + (url.includes('?') ? '&' : '?') + 'ajax=true';
    
    // Fetch the page content
    fetch(ajaxUrl)
        .then(response => response.text())
        .then(html => {
            // Parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract the content wrapper
            const contentWrapper = doc.querySelector('.content-wrapper') || 
                                  doc.querySelector('.risk-dashboard-wrapper');
            
            // Replace the current content wrapper with the new one
            const currentContentWrapper = document.querySelector('.content-wrapper') || 
                                         document.querySelector('.risk-dashboard-wrapper');
            
            if (contentWrapper && currentContentWrapper) {
                currentContentWrapper.replaceWith(contentWrapper);
                
                // Update the page URL without refreshing
                history.pushState({}, '', url);
                
                // Restore saved state if available
                restorePageState(url);
                
                // Reinitialize page-specific functionality
                initializePageFunctionality(url);
            } else {
                // Fallback to traditional navigation if content wrapper not found
                window.location.href = url;
            }
            
            // Hide loading indicator
            hideLoading();
        })
        .catch(error => {
            console.error('Error loading page content:', error);
            // Fallback to traditional navigation on error
            window.location.href = url;
        });
}

// Update active navigation link
function updateActiveNavLink(activeLink) {
    // Remove active class from all links
    document.querySelectorAll('.main-nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to the clicked link
    activeLink.classList.add('active');
}

// Restore saved page state
function restorePageState(url) {
    if (url.includes('/dashboard')) {
        // Restore dashboard state
        const searchQuery = sessionStorage.getItem('dashboard_search') || '';
        const selectedIndustries = JSON.parse(sessionStorage.getItem('dashboard_industries') || '[]');
        
        // Apply saved state
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = searchQuery;
        
        // Check the appropriate industry checkboxes
        document.querySelectorAll('input[name="industry"]').forEach(cb => {
            cb.checked = selectedIndustries.includes(cb.value);
        });
        
        // Update select all checkbox state
        updateSelectAllState();
        
        console.log('Restored dashboard state:', { searchQuery, selectedIndustries });
    } 
    else if (url.includes('/companies')) {
        // Restore companies state
        const searchQuery = sessionStorage.getItem('companies_search') || '';
        const riskFilter = sessionStorage.getItem('companies_risk_filter') || '';
        
        // Apply saved state
        const searchInput = document.getElementById('companySearchInput');
        if (searchInput) searchInput.value = searchQuery;
        
        // Check the appropriate risk filter radio button
        if (riskFilter) {
            const radioButton = document.querySelector(`input[name="risk-filter"][value="${riskFilter}"]`);
            if (radioButton) radioButton.checked = true;
        }
        
        console.log('Restored companies state:', { searchQuery, riskFilter });
    }
}

// Initialize page-specific functionality
function initializePageFunctionality(url) {
    if (url.includes('/dashboard')) {
        // Initialize dashboard functionality
        initializeCheckboxes();
        
        // Reattach event listeners
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.getElementById('searchButton');
        const selectAllCheckbox = document.getElementById('selectAll');
        const industryCheckboxes = document.querySelectorAll('input[name="industry"]');
        
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchQuery = this.value.trim();
                if (searchQuery.length > 0) {
                    showSearchSuggestions(searchQuery);
                } else {
                    hideSearchSuggestions();
                }
            });
            
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    const searchQuery = this.value.trim();
                    if (searchQuery) {
                        performSearch(searchQuery);
                    }
                }
            });
        }
        
        if (searchButton) {
            searchButton.addEventListener('click', function() {
                const searchQuery = searchInput.value.trim();
                if (searchQuery) {
                    performSearch(searchQuery);
                }
            });
        }
        
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                const newState = this.checked;
                industryCheckboxes.forEach(cb => {
                    cb.checked = newState;
                });
                updateResults();
            });
        }
        
        industryCheckboxes.forEach(cb => {
            cb.addEventListener('change', function() {
                const allChecked = Array.from(industryCheckboxes).every(cb => cb.checked);
                const someChecked = Array.from(industryCheckboxes).some(cb => cb.checked);
                
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = allChecked;
                    selectAllCheckbox.indeterminate = !allChecked && someChecked;
                }
                
                updateResults();
            });
        });
        
        // Reattach delete industry buttons
        const deleteButtons = document.querySelectorAll('.delete-industry');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const industry = this.getAttribute('data-industry');
                const username = new URLSearchParams(window.location.search).get('username');
                if (industry && username) {
                    deleteIndustry(industry, username);
                }
            });
        });
    } 
    else if (url.includes('/companies')) {
        // Initialize companies page functionality
        
        // Reattach event listeners for company search
        const companySearchInput = document.getElementById('companySearchInput');
        const companySearchButton = document.getElementById('companySearchButton');
        
        if (companySearchInput && companySearchButton) {
            companySearchButton.addEventListener('click', function() {
                const searchQuery = companySearchInput.value.trim();
                filterCompanies(searchQuery);
            });
            
            companySearchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    const searchQuery = this.value.trim();
                    filterCompanies(searchQuery);
                }
            });
        }
        
        // Reattach event listeners for risk filters
        const riskFilters = document.querySelectorAll('input[name="risk-filter"]');
        riskFilters.forEach(filter => {
            filter.addEventListener('change', function() {
                const riskLevel = this.value;
                filterCompaniesByRisk(riskLevel);
            });
        });
        
        // Reattach company detail view functionality
        const companyRows = document.querySelectorAll('.company-row');
        companyRows.forEach(row => {
            row.addEventListener('click', function() {
                const companyId = this.getAttribute('data-company-id');
                if (companyId) {
                    showCompanyDetails(companyId);
                }
            });
        });
    }
    
    // Reattach smooth page transitions
    setupSmoothPageTransitions();
}

// Filter companies by search query
function filterCompanies(query) {
    const params = new URLSearchParams(window.location.search);
    
    if (query) {
        params.set('search', query);
    } else {
        params.delete('search');
    }
    
    // Keep risk filter if present
    const riskFilter = document.querySelector('input[name="risk-filter"]:checked')?.value;
    if (riskFilter) {
        params.set('risk', riskFilter);
    } else {
        params.delete('risk');
    }
    
    // Show loading indicator
    showLoading();
    
    // Load filtered companies
    loadPageContent(`/companies?${params.toString()}`);
}

// Filter companies by risk level
function filterCompaniesByRisk(riskLevel) {
    const params = new URLSearchParams(window.location.search);
    
    if (riskLevel && riskLevel !== 'all') {
        params.set('risk', riskLevel);
    } else {
        params.delete('risk');
    }
    
    // Keep search query if present
    const searchQuery = document.getElementById('companySearchInput')?.value.trim();
    if (searchQuery) {
        params.set('search', searchQuery);
    } else {
        params.delete('search');
    }
    
    // Show loading indicator
    showLoading();
    
    // Load filtered companies
    loadPageContent(`/companies?${params.toString()}`);
}

// Show company details
function showCompanyDetails(companyId) {
    // Implementation depends on how company details are displayed
    // This could open a modal or navigate to a detail page
    const detailModal = document.getElementById(`company-detail-${companyId}`);
    if (detailModal) {
        detailModal.style.display = 'block';
        
        // Add close functionality
        const closeButton = detailModal.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                detailModal.style.display = 'none';
            });
        }
        
        // Close when clicking outside the modal
        window.addEventListener('click', function(e) {
            if (e.target === detailModal) {
                detailModal.style.display = 'none';
            }
        });
    }
}

// Show loading indicator
function showLoading() {
    // Check if loading overlay already exists
    let loadingOverlay = document.getElementById('loading-overlay');
    
    if (!loadingOverlay) {
        // Create loading overlay
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading...</span>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }
    
    // Show the loading overlay
    loadingOverlay.style.display = 'flex';
}

// Hide loading indicator
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}
