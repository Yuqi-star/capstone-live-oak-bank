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
            if (subIndustriesContainer) {
                subIndustriesContainer.style.display = 'flex';
            }
            
            // Toggle functionality to show/hide sub-industries
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
    function showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            const messageElement = overlay.querySelector('.loading-spinner span');
            if (messageElement) {
                messageElement.textContent = message;
            }
            overlay.style.display = 'flex';
        } else {
            // Create loading overlay if it doesn't exist
            const newOverlay = document.createElement('div');
            newOverlay.id = 'loading-overlay';
            newOverlay.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>${message}</span>
                </div>
            `;
            newOverlay.style.display = 'flex';
            document.body.appendChild(newOverlay);
        }
    }
    
    // Hide loading indicator
    function hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            // Reset the message to default
            const messageElement = overlay.querySelector('.loading-spinner span');
            if (messageElement) {
                messageElement.textContent = 'Loading...';
            }
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

    // Alert and Report Modal Functionality
    const notifyEmail = document.getElementById('notifyEmail');
    const notifySMS = document.getElementById('notifySMS');
    const emailField = document.getElementById('emailField');
    const phoneField = document.getElementById('phoneField');
    const deliveryEmail = document.getElementById('deliveryEmail');
    const reportEmailField = document.getElementById('reportEmailField');

    if (notifyEmail) {
        notifyEmail.addEventListener('change', function() {
            emailField.style.display = this.checked ? 'block' : 'none';
        });
    }

    if (notifySMS) {
        notifySMS.addEventListener('change', function() {
            phoneField.style.display = this.checked ? 'block' : 'none';
        });
    }

    if (deliveryEmail) {
        deliveryEmail.addEventListener('change', function() {
            reportEmailField.style.display = this.checked ? 'block' : 'none';
        });
    }

    // Handle alert button clicks
    const alertButtons = document.querySelectorAll('.add-alert');
    alertButtons.forEach(button => {
        button.addEventListener('click', function() {
            const companyName = this.getAttribute('data-company');
            document.getElementById('alertCompanyName').value = companyName;
            document.querySelector('#alertModal .company-name').textContent = companyName;
            new bootstrap.Modal(document.getElementById('alertModal')).show();
        });
    });

    // Handle report button clicks
    const reportButtons = document.querySelectorAll('.modal-btn.primary');
    reportButtons.forEach(button => {
        button.addEventListener('click', function() {
            const companyName = this.closest('.modal-content').querySelector('#modalCompanyName').textContent;
            document.getElementById('reportCompanyName').value = companyName;
            document.querySelector('#reportModal .company-name').textContent = companyName;
            new bootstrap.Modal(document.getElementById('reportModal')).show();
        });
    });

    // 表格排序功能
    const table = document.querySelector('.risk-table table');
    if (!table) return;
    
    // 获取表头和行
    const headers = table.querySelectorAll('th.sortable');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    // 当前排序状态
    let currentSort = {
        column: 'pd',
        direction: 'desc'
    };
    
    // 初始排序（按照违约概率降序）
    sortTable('pd', 'desc');
    
    // 为每个可排序的表头添加点击事件
    headers.forEach(header => {
        header.addEventListener('click', function() {
            const column = this.getAttribute('data-sort');
            let direction = 'asc';
            
            // 如果已经按该列排序，则切换排序方向
            if (currentSort.column === column) {
                direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            }
            
            // 执行排序
            sortTable(column, direction);
            
            // 更新排序图标
            updateSortIcons(column, direction);
            
            // 更新当前排序状态
            currentSort = { column, direction };
        });
    });
    
    // 排序表格
    function sortTable(column, direction) {
        const sortedRows = rows.sort((a, b) => {
            let aValue = getCellValue(a, column);
            let bValue = getCellValue(b, column);
            
            // 根据列的不同，可能需要特殊的排序逻辑
            if (column === 'pd' || column === 'roe') {
                // 提取百分比数值
                aValue = parseFloat(aValue.replace('%', ''));
                bValue = parseFloat(bValue.replace('%', ''));
            } else if (column === 'expected_loss') {
                // 提取美元值
                aValue = parseFloat(aValue.replace('$', '').replace(',', ''));
                bValue = parseFloat(bValue.replace('$', '').replace(',', ''));
            } else if (column === 'coverage_ratio' || column === 'leverage_ratio' || column === 'current_ratio') {
                // 提取数值
                aValue = parseFloat(aValue.replace('x', ''));
                bValue = parseFloat(bValue.replace('x', ''));
            } else if (column === 'rating') {
                // 信用评级排序逻辑
                const ratingOrder = {
                    'AAA': 1, 'AA+': 2, 'AA': 3, 'AA-': 4, 'A+': 5, 'A': 6, 'A-': 7,
                    'BBB+': 8, 'BBB': 9, 'BBB-': 10, 'BB+': 11, 'BB': 12, 'BB-': 13,
                    'B+': 14, 'B': 15, 'B-': 16, 'CCC+': 17, 'CCC': 18, 'CCC-': 19
                };
                aValue = ratingOrder[aValue] || 20;
                bValue = ratingOrder[bValue] || 20;
            } else if (column === 'risk_level') {
                // 风险级别排序逻辑
                const riskOrder = { 'Low': 1, 'Medium': 2, 'High': 3 };
                aValue = riskOrder[aValue] || 0;
                bValue = riskOrder[bValue] || 0;
            }
            
            // 比较值
            if (aValue < bValue) {
                return direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        
        // 将排序后的行重新添加到表格中
        sortedRows.forEach(row => tbody.appendChild(row));
    }
    
    // 获取单元格的值
    function getCellValue(row, column) {
        const cellIndex = {
            'company': 0,
            'rating': 1,
            'pd': 2,
            'expected_loss': 3,
            'current_ratio': 4,
            'roe': 5,
            'leverage_ratio': 6,
            'coverage_ratio': 7,
            'risk_level': 8
        };
        
        const index = cellIndex[column];
        const cell = row.querySelectorAll('td')[index];
        
        // 对于风险级别，获取徽章内的文本
        if (column === 'risk_level') {
            return cell.querySelector('.risk-badge').textContent.trim();
        }
        
        // 对于覆盖率，获取span内的文本
        if (column === 'coverage_ratio') {
            return cell.querySelector('.coverage-ratio').textContent.trim();
        }
        
        return cell.textContent.trim();
    }
    
    // 更新排序图标
    function updateSortIcons(activeColumn, direction) {
        headers.forEach(header => {
            const column = header.getAttribute('data-sort');
            const icon = header.querySelector('i.fas');
            
            if (column === activeColumn) {
                icon.className = direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            } else {
                icon.className = 'fas fa-sort';
            }
        });
    }
    
    // 初始排序图标设置
    updateSortIcons(currentSort.column, currentSort.direction);

    // Initialize when document is ready - this is the entry point
    console.log('Document ready, initializing all functionality');
    
    // Initialize functionality based on current URL
    initializePageFunctionality(window.location.pathname);
});

function submitAlert() {
    console.log("Running submitAlert function");
    
    // Show loading indicator
    showLoading("Setting up alert...");
    
    const form = document.getElementById('alertForm');
    if (!form) {
        console.error("Alert form not found");
        hideLoading();
        return;
    }
    
    const formData = new FormData(form);
    const data = {
        company_name: formData.get('company_name'),
        metric: formData.get('metric'),
        condition: formData.get('condition'),
        threshold: parseFloat(formData.get('threshold')),
        notify_email: formData.get('notify_email') === 'on',
        notify_sms: formData.get('notify_sms') === 'on',
        notify_dashboard: formData.get('notify_dashboard') === 'on' || true, // Default to true if not specified
        email: formData.get('email'),
        phone: formData.get('phone')
    };
    
    console.log("Alert data:", data);

    // Validate form
    if (!data.company_name) {
        hideLoading();
        showNotification('Please select a company', 'error');
        return;
    }
    
    if (!data.metric || !data.condition || isNaN(data.threshold)) {
        hideLoading();
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    if (data.notify_email && !data.email) {
        hideLoading();
        showNotification('Please provide an email address for email notifications', 'error');
        return;
    }

    if (data.notify_sms && !data.phone) {
        hideLoading();
        showNotification('Please provide a phone number for SMS notifications', 'error');
        return;
    }
    
    // Check that at least one notification method is selected
    if (!data.notify_email && !data.notify_sms && !data.notify_dashboard) {
        hideLoading();
        showNotification('Please select at least one notification method', 'error');
        return;
    }

    // Submit alert
    fetch('/api/set_alert', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log("API response status:", response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        hideLoading();
        console.log("API result:", result);
        if (result.success) {
            showNotification(`Alert set successfully for ${data.company_name}: ${data.metric} ${data.condition} ${data.threshold}`, 'success');
            
            // Close modal
            const modalElement = document.getElementById('alertModal');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
            
            form.reset();
        } else {
            showNotification(result.message || 'Error setting alert', 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showNotification('Error setting alert: ' + error.message, 'error');
        console.error('Error:', error);
    });
}

function submitReport() {
    const form = document.getElementById('reportForm');
    const formData = new FormData(form);
    
    // Validate form data
    if (!validateReportForm(formData)) {
        return;
    }
    
    // Ensure PDF format is selected by default
    if (!formData.get('format')) {
        formData.set('format', 'pdf');
    }
    
    // Show loading indicator with custom message
    showLoading("Generating your professional Live Oak Bank report...");
    
    // Send request to generate report
    fetch('/api/generate_report', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideLoading();
        if (data.success) {
            // Create a more detailed success notification
            const format = formData.get('format') || 'pdf';
            const formatName = format.toUpperCase();
            
            showNotification(`Your ${formatName} report for ${formData.get('company_name')} has been successfully generated!`, 'success');
            closeDetailModal('reportModal');
            
            // If download is requested and URL is provided, trigger download
            if (formData.get('delivery_download') === 'on' && data.download_url) {
                // Add a small delay before triggering download to ensure modal is closed
                setTimeout(() => {
                    window.location.href = data.download_url;
                }, 300);
            }
        } else {
            showNotification(data.message || 'Failed to generate report', 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showNotification('Error generating report: ' + error.message, 'error');
    });
}

function validateReportForm(formData) {
    // Check if at least one section is selected
    const sections = formData.getAll('sections');
    if (sections.length === 0) {
        showNotification('Please select at least one report section', 'error');
        return false;
    }
    
    // Check if at least one delivery method is selected
    const deliveryMethods = [
        formData.get('delivery_email') === 'on',
        formData.get('delivery_download') === 'on',
        formData.get('delivery_dashboard') === 'on'
    ];
    if (!deliveryMethods.some(method => method)) {
        showNotification('Please select at least one delivery method', 'error');
        return false;
    }
    
    // Check email if email delivery is selected
    if (formData.get('delivery_email') === 'on' && !formData.get('email')) {
        showNotification('Please enter an email address for delivery', 'error');
        return false;
    }
    
    return true;
}

// Add event listeners for report form
document.addEventListener('DOMContentLoaded', function() {
    // Handle email delivery checkbox
    const emailCheckbox = document.getElementById('deliveryEmail');
    const emailField = document.getElementById('reportEmailField');
    
    if (emailCheckbox && emailField) {
        emailCheckbox.addEventListener('change', function() {
            emailField.style.display = this.checked ? 'block' : 'none';
        });
    }
    
    // Handle template change
    const templateSelect = document.getElementById('reportTemplate');
    if (templateSelect) {
        templateSelect.addEventListener('change', function() {
            updateSectionsByTemplate(this.value);
        });
    }
});

function updateSectionsByTemplate(template) {
    const sections = {
        standard: ['company_info', 'risk_profile', 'financial_metrics'],
        executive: ['company_info', 'risk_profile', 'recommendations'],
        detailed: ['company_info', 'risk_profile', 'financial_metrics', 'historical_data', 'industry_comparison', 'news_analysis', 'recommendations'],
        custom: [] // No default selections for custom
    };
    
    // Uncheck all sections first
    document.querySelectorAll('input[name="sections"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Check sections based on template
    if (template !== 'custom') {
        sections[template].forEach(section => {
            const checkbox = document.querySelector(`input[name="sections"][value="${section}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
}

function showNotification(message, type = 'success') {
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertElement.setAttribute('role', 'alert');
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alertElement);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertElement.remove();
    }, 5000);
}

// Setup smooth page transitions between dashboard and companies pages
function setupSmoothPageTransitions() {
    console.log("Setting up smooth page transitions");
    
    // Get navigation links
    const navLinks = document.querySelectorAll('.main-nav a');
    console.log("Number of navigation links found:", navLinks.length);
    
    // Remove any existing event listeners (to prevent duplicates)
    navLinks.forEach(link => {
        // Clone the node to remove all event listeners
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
    });
    
    // Add click event listeners to navigation links
    document.querySelectorAll('.main-nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Navigation link clicked:", this.href);
            
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
    console.log("加载页面内容:", url);
    
    // Show loading indicator
    showLoading("Loading page...");
    
    // Add a parameter to indicate this is an AJAX request
    const ajaxUrl = url + (url.includes('?') ? '&' : '?') + 'ajax=true';
    console.log("AJAX URL:", ajaxUrl);
    
    // Fetch the page content
    fetch(ajaxUrl)
        .then(response => {
            console.log("AJAX响应状态:", response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            console.log("收到HTML响应，长度:", html.length);
            
            // Parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Determine which type of page is being loaded
            let contentWrapper;
            let currentContentWrapper;
            
            if (url.includes('/dashboard')) {
                // For dashboard page
                contentWrapper = doc.querySelector('.content-wrapper');
                currentContentWrapper = document.querySelector('.content-wrapper, .risk-dashboard-wrapper, .profiles-dashboard-wrapper');
            } else if (url.includes('/companies')) {
                // For companies/credit risk page
                contentWrapper = doc.querySelector('.risk-dashboard-wrapper');
                currentContentWrapper = document.querySelector('.content-wrapper, .risk-dashboard-wrapper, .profiles-dashboard-wrapper');
            } else if (url.includes('/company_profiles')) {
                // For company profiles page
                contentWrapper = doc.querySelector('.profiles-dashboard-wrapper');
                currentContentWrapper = document.querySelector('.content-wrapper, .risk-dashboard-wrapper, .profiles-dashboard-wrapper');
            }
            
            console.log("找到内容包装器:", contentWrapper ? true : false);
            console.log("当前内容包装器:", currentContentWrapper ? true : false);
            
            if (contentWrapper && currentContentWrapper) {
                // Replace content and update URL
                currentContentWrapper.replaceWith(contentWrapper);
                history.pushState({}, '', url);
                console.log("内容已替换, URL已更新:", url);
                
                // Restore saved state and initialize functionality
                restorePageState(url);
                initializePageFunctionality(url);
                
                // Setup page transitions again for the new content
                setupSmoothPageTransitions();
            } else {
                console.log("未找到内容包装器或当前内容包装器，回退到传统导航");
                window.location.href = url;
            }
            
            // Hide loading indicator
            hideLoading();
        })
        .catch(error => {
            console.error('加载页面内容时出错:', error);
            // Fallback to traditional navigation on error
            window.location.href = url;
            hideLoading();
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
    console.log('Initializing functionality for:', url);
    
    // Common functionality for all pages
    setupSmoothPageTransitions();
    
    // Initialize bootstrap modals
    initializeModals();
    
    if (url.includes('/dashboard')) {
        // Initialize dashboard specific functionality
        console.log('Initializing dashboard functionality');
        initializeCheckboxes();
        initializeIndustryToggles();
        
        document.querySelector('#searchInput').addEventListener('input', function() {
            if (this.value.length > 2) {
                showSearchSuggestions(this.value);
            } else {
                hideSearchSuggestions();
            }
        });
        
        document.querySelector('#searchButton').addEventListener('click', function() {
            const query = document.querySelector('#searchInput').value;
            performSearch(query);
        });
        
        document.querySelector('#searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch(this.value);
            }
        });
    } 
    else if (url.includes('/companies')) {
        // Initialize companies page specific functionality
        console.log('Initializing companies functionality');
        
        // Initialize risk filter radio buttons
        document.querySelectorAll('input[name="risk-filter"]').forEach(radio => {
            radio.addEventListener('change', function() {
                filterCompaniesByRisk(this.value);
            });
        });
        
        // Initialize search functionality
        document.getElementById('companySearchButton')?.addEventListener('click', function() {
            const query = document.getElementById('companySearchInput').value;
            filterCompanies(query);
        });
        
        document.getElementById('companySearchInput')?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                filterCompanies(this.value);
            }
        });
        
        // Initialize view details buttons
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', function() {
                const companyId = this.closest('tr').getAttribute('data-company-id');
                showCompanyDetails(companyId);
            });
        });
        
        // Initialize modal field show/hide logic
        const notifyEmail = document.getElementById('notifyEmail');
        const emailField = document.getElementById('emailField');
        
        if (notifyEmail && emailField) {
            notifyEmail.addEventListener('change', function() {
                emailField.style.display = this.checked ? 'block' : 'none';
            });
        }
        
        const notifySMS = document.getElementById('notifySMS');
        const phoneField = document.getElementById('phoneField');
        
        if (notifySMS && phoneField) {
            notifySMS.addEventListener('change', function() {
                phoneField.style.display = this.checked ? 'block' : 'none';
            });
        }
        
        const deliveryEmail = document.getElementById('deliveryEmail');
        const reportEmailField = document.getElementById('reportEmailField');
        
        if (deliveryEmail && reportEmailField) {
            deliveryEmail.addEventListener('change', function() {
                reportEmailField.style.display = this.checked ? 'block' : 'none';
            });
        }
        
        // Add listeners for company detail modal buttons
        document.querySelectorAll('.modal-actions .secondary').forEach(button => {
            button.addEventListener('click', function() {
                const modalElement = this.closest('.modal');
                const companyName = modalElement.querySelector('h2').textContent;
                showAlertModal(companyName);
                closeDetailModal(modalElement.id);
            });
        });
        
        document.querySelectorAll('.modal-actions .primary').forEach(button => {
            button.addEventListener('click', function() {
                const modalElement = this.closest('.modal');
                const companyName = modalElement.querySelector('h2').textContent;
                showReportModal(companyName);
                closeDetailModal(modalElement.id);
            });
        });
        
        // Close modal functionality for custom modals
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', function() {
                const modalId = this.closest('.modal').id;
                closeDetailModal(modalId);
            });
        });
    }
    else if (url.includes('/company_profiles')) {
        // Initialize company profiles page specific functionality
        console.log('Initializing company profiles functionality');
        
        // Initialize view toggle
        document.querySelectorAll('.view-btn').forEach(button => {
            button.addEventListener('click', function() {
                const viewType = this.getAttribute('data-view');
                document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                const container = document.querySelector('.company-profiles-container');
                container.classList.remove('grid-view', 'list-view');
                container.classList.add(viewType + '-view');
            });
        });
        
        // Initialize search functionality
        document.getElementById('profilesSearchButton')?.addEventListener('click', function() {
            const query = document.getElementById('profilesSearchInput').value;
            // Implement profile search
        });
        
        document.getElementById('profilesSearchInput')?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                // Implement profile search
            }
        });
    }
}

// Initialize modals for alert and report
function initializeModals() {
    console.log("Initializing modals");
    
    // Initialize company details modals
    document.querySelectorAll('.view-details').forEach(button => {
        if (!button.getAttribute('onclick')) {
            button.addEventListener('click', function() {
                const companyId = this.closest('tr').dataset.companyId;
                console.log("View details clicked for company ID:", companyId);
                showCompanyDetails(companyId);
            });
        }
    });
    
    // Initialize Alert Modal Event Listeners
    const notifyEmailCheckbox = document.getElementById('notifyEmail');
    const notifySMSCheckbox = document.getElementById('notifySMS');
    const emailField = document.getElementById('emailField');
    const phoneField = document.getElementById('phoneField');
    
    if (notifyEmailCheckbox) {
        notifyEmailCheckbox.addEventListener('change', function() {
            emailField.style.display = this.checked ? 'block' : 'none';
        });
    }
    
    if (notifySMSCheckbox) {
        notifySMSCheckbox.addEventListener('change', function() {
            phoneField.style.display = this.checked ? 'block' : 'none';
        });
    }
    
    // Initialize Report Modal Event Listeners
    const deliveryEmailCheckbox = document.getElementById('deliveryEmail');
    const reportEmailField = document.getElementById('reportEmailField');
    
    if (deliveryEmailCheckbox) {
        deliveryEmailCheckbox.addEventListener('change', function() {
            reportEmailField.style.display = this.checked ? 'block' : 'none';
        });
    }
    
    // Custom event listeners for close buttons on detail modals
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close custom modals when clicking outside content
    window.addEventListener('click', function(event) {
        document.querySelectorAll('.modal:not(.fade)').forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Initialize Generate Report buttons in detail modal
    document.querySelectorAll('.modal-actions .modal-btn.primary').forEach(button => {
        button.addEventListener('click', function() {
            // 关闭当前公司详情模态框
            const detailModal = this.closest('.modal');
            if (detailModal) {
                detailModal.style.display = 'none';
            }
            
            // 获取公司名称并打开报告模态框
            const companyName = this.getAttribute('data-company');
            if (companyName) {
                console.log("Opening report modal for:", companyName);
                setTimeout(() => {
                    showReportModal(companyName);
                }, 100); // 加入短暂延迟让详情模态框完全关闭
            }
        });
    });
}

// Function to show alert modal
function showAlertModal(companyName) {
    console.log("Opening alert modal for:", companyName);
    
    // Set company name in the modal title and form
    document.querySelectorAll('#alertModal .company-name').forEach(function(element) {
        element.textContent = companyName;
    });
    document.getElementById('alertCompanyName').value = companyName;
    
    // Reset any previously modified option text first to avoid duplication
    const metricSelect = document.querySelector('#alertForm select[name="metric"]');
    if (metricSelect) {
        const metricOptions = metricSelect.querySelectorAll('option');
        metricOptions.forEach(option => {
            // Remove any current value information from previous opens
            option.textContent = option.textContent.replace(/ \(Current:.*\)$/, '');
        });
    }
    
    // Fetch current company metrics to help users set thresholds
    fetch(`/api/company_metrics?company=${encodeURIComponent(companyName)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error fetching company metrics');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Could pre-fill threshold fields based on current metrics
                console.log("Retrieved company metrics:", data.metrics);
                
                // Add current values to option labels
                if (metricSelect) {
                    const metricOptions = metricSelect.querySelectorAll('option');
                    metricOptions.forEach(option => {
                        const metricKey = option.value;
                        if (data.metrics[metricKey] !== undefined) {
                            option.textContent = `${option.textContent} (Current: ${data.metrics[metricKey]})`;
                        }
                    });
                }
            }
        })
        .catch(error => {
            console.error('Error fetching company metrics:', error);
        });
    
    // Get the modal element
    const modalElement = document.getElementById('alertModal');
    
    // Create a new modal instance or get existing
    let modalInstance = bootstrap.Modal.getInstance(modalElement);
    if (!modalInstance) {
        modalInstance = new bootstrap.Modal(modalElement, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
    }
    
    // Show the modal
    modalInstance.show();
}

// Function to show report modal
function showReportModal(companyName) {
    document.getElementById('reportCompanyName').value = companyName;
    document.querySelector('#reportModal .company-name').textContent = companyName;
    
    // Initialize the modal
    const modal = document.getElementById('reportModal');
    modal.style.display = 'block';
    
    // Reset form
    document.getElementById('reportForm').reset();
    
    // Set default template
    document.getElementById('reportTemplate').value = 'standard';
    
    // Check default sections
    document.getElementById('sectionCompanyInfo').checked = true;
    document.getElementById('sectionRiskProfile').checked = true;
    document.getElementById('sectionFinancial').checked = true;
    
    // Check default visualizations
    document.getElementById('vizRiskChart').checked = true;
    document.getElementById('vizFinancialChart').checked = true;
    
    // Set default delivery method
    document.getElementById('deliveryDownload').checked = true;
    
    // Set default format
    document.querySelector('select[name="format"]').value = 'pdf';
}

// Function to show company details modal
function showCompanyDetails(companyId) {
    console.log("Showing company details for ID:", companyId);
    const modal = document.getElementById(`company-detail-${companyId}`);
    if (!modal) {
        console.error(`Modal not found for company ID: ${companyId}`);
        return;
    }
    
    // Show the modal with flexbox display to center it
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    // Log for debugging
    console.log("Modal element:", modal);
    console.log("Modal style display:", modal.style.display);
    
    // Scroll to the top of the modal content
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.scrollTop = 0;
        console.log("Modal content found and scrolled to top");
    } else {
        console.error("Modal content not found");
    }
    
    // Close modal on X click
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = function() {
            closeDetailModal(modal.id);
        };
        console.log("Close button handler attached");
    } else {
        console.error("Close button not found");
    }
    
    // Close modal when clicking outside
    // Use a named function reference that we can remove later to prevent memory leaks
    modal.onclick = function(event) {
        if (event.target === modal) {
            closeDetailModal(modal.id);
        }
    };
}

// Function to close detail modal
function closeDetailModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        
        // Remove the click event handler to prevent memory leaks
        if (modal.onclick) {
            modal.onclick = null;
        }
    }
}

// Filter companies by search query
function filterCompanies(query) {
    console.log("过滤公司，查询:", query);
    const params = new URLSearchParams(window.location.search);
    
    if (query) {
        params.set('search', query);
    } else {
        params.delete('search');
    }
    
    // Keep risk filter if present
    const riskFilter = document.querySelector('input[name="risk-filter"]:checked')?.value;
    console.log("当前风险筛选:", riskFilter);
    
    if (riskFilter && riskFilter !== 'all') {
        params.set('risk', riskFilter);
    } else {
        params.delete('risk');
    }
    
    const url = `/companies?${params.toString()}`;
    console.log("加载URL:", url);
    
    // Show loading indicator
    showLoading();
    
    // Load filtered companies
    loadPageContent(url);
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

// DSCR Analysis Functions
function calculateDSCR(companyData, interestRate = 0.05) {
    // Get the current DSCR from financial metrics
    const currentDSCR = companyData['Debt Service Coverage Ratio'];
    
    // Calculate the projected DSCR based on interest rate change
    // The relationship between DSCR and interest rate is inverse
    // If interest rate increases by x%, DSCR decreases proportionally
    const interestRateChange = (interestRate - 0.05) / 0.05; // Calculate percentage change from base rate
    const projectedDSCR = currentDSCR / (1 + interestRateChange);
    
    return parseFloat(projectedDSCR.toFixed(2));
}

function getIndustryAverageDSCR(industry) {
    // In a real application, this would fetch industry data from a database
    // Here we'll use mock data based on industry
    const industryData = {
        'Healthcare': 1.65,
        'Solar Energy': 1.45,
        'Technology': 1.85,
        'AI': 1.95,
        'default': 1.55
    };
    
    return industryData[industry] || industryData['default'];
}

function getIndustryMinMaxDSCR(industry) {
    // Mock data for industry DSCR ranges
    const industryRanges = {
        'Healthcare': { min: 0.95, max: 2.35 },
        'Solar Energy': { min: 0.85, max: 2.15 },
        'Technology': { min: 1.05, max: 2.55 },
        'AI': { min: 1.15, max: 2.75 },
        'default': { min: 0.90, max: 2.25 }
    };
    
    return industryRanges[industry] || industryRanges['default'];
}

function analyzeDSCR(dscr, industryAvg, projectedDSCR, companyData) {
    let analysis = '';
    let dscrHealth = '';
    
    // Get key company metrics
    const pd = companyData['Probability of Default'] * 100; // Default probability
    const creditRating = companyData['Credit Rating']; // Credit rating
    const leverageRatio = companyData['Leverage Ratio']; // Leverage ratio
    const roe = companyData['ROE'] * 100; // Return on equity
    const currentRatio = companyData['Current Ratio']; // Current ratio
    const debtServiceCoverageRatio = companyData['Debt Service Coverage Ratio']; // Debt service coverage ratio
    
    // Analyze current DSCR
    if (dscr >= 2.0) {
        dscrHealth = 'excellent';
        analysis += `<p>The company's current Debt Service Coverage Ratio (DSCR) of <strong>${dscr.toFixed(2)}</strong> is excellent, indicating an exceptional ability to service debt. `;
    } else if (dscr >= 1.5) {
        dscrHealth = 'strong';
        analysis += `<p>The company's current Debt Service Coverage Ratio (DSCR) of <strong>${dscr.toFixed(2)}</strong> is strong, indicating a solid ability to service debt. `;
    } else if (dscr >= 1.25) {
        dscrHealth = 'good';
        analysis += `<p>The company's current Debt Service Coverage Ratio (DSCR) of <strong>${dscr.toFixed(2)}</strong> is good, indicating an adequate ability to service debt. `;
    } else if (dscr >= 1.0) {
        dscrHealth = 'adequate';
        analysis += `<p>The company's current Debt Service Coverage Ratio (DSCR) of <strong>${dscr.toFixed(2)}</strong> is adequate, just meeting minimum debt service requirements. `;
    } else {
        dscrHealth = 'poor';
        analysis += `<p>The company's current Debt Service Coverage Ratio (DSCR) of <strong>${dscr.toFixed(2)}</strong> is below the safety threshold, indicating potential debt service difficulties. `;
    }
    
    // Compare to industry average
    if (dscr > industryAvg) {
        const abovePercent = ((dscr - industryAvg) / industryAvg * 100).toFixed(1);
        analysis += `This value is approximately ${abovePercent}% above the industry average of <strong>${industryAvg}</strong>, suggesting superior debt servicing capability compared to peers.</p>`;
    } else if (dscr < industryAvg) {
        const belowPercent = ((industryAvg - dscr) / industryAvg * 100).toFixed(1);
        analysis += `This value is approximately ${belowPercent}% below the industry average of <strong>${industryAvg}</strong>, suggesting weaker debt servicing capability compared to peers.</p>`;
    } else {
        analysis += `This value is on par with the industry average of <strong>${industryAvg}</strong>.</p>`;
    }
    
    // Comprehensive risk analysis
    analysis += `<p><strong>Comprehensive Risk Analysis:</strong> The company `;
    
    // Default probability analysis
    if (pd < 1.0) {
        analysis += `has an extremely low default probability (${pd.toFixed(2)}%), `;
    } else if (pd < 5.0) {
        analysis += `has a moderate default probability (${pd.toFixed(2)}%), `;
    } else {
        analysis += `has a high default probability (${pd.toFixed(2)}%), `;
    }
    
    // Credit rating analysis
    if (creditRating.startsWith('A')) {
        analysis += `maintains a high credit rating (${creditRating}), `;
    } else if (creditRating.startsWith('BB')) {
        analysis += `has a moderate credit rating (${creditRating}), `;
    } else {
        analysis += `has a lower credit rating (${creditRating}), `;
    }
    
    // Leverage ratio analysis
    if (leverageRatio < 0.3) {
        analysis += `and operates with a low leverage ratio (${leverageRatio.toFixed(2)}), indicating strong risk absorption capacity.`;
    } else if (leverageRatio < 0.6) {
        analysis += `and operates with a moderate leverage ratio (${leverageRatio.toFixed(2)}), indicating reasonable risk absorption capacity.`;
    } else {
        analysis += `and operates with a high leverage ratio (${leverageRatio.toFixed(2)}), indicating limited risk absorption capacity.`;
    }
    analysis += `</p>`;
    
    // Financial health analysis
    analysis += `<p><strong>Financial Health Assessment:</strong> `;
    
    // ROE analysis
    if (roe > 15) {
        analysis += `The company demonstrates a high return on equity (${roe.toFixed(2)}%), `;
    } else if (roe > 8) {
        analysis += `The company shows a moderate return on equity (${roe.toFixed(2)}%), `;
    } else if (roe > 0) {
        analysis += `The company exhibits a low return on equity (${roe.toFixed(2)}%), `;
    } else {
        analysis += `The company has a negative return on equity (${roe.toFixed(2)}%), `;
    }
    
    // Current ratio analysis
    if (currentRatio > 2.0) {
        analysis += `with a healthy current ratio (${currentRatio.toFixed(2)}), indicating strong short-term debt servicing capability.`;
    } else if (currentRatio > 1.0) {
        analysis += `with an adequate current ratio (${currentRatio.toFixed(2)}), indicating acceptable short-term debt servicing capability.`;
    } else {
        analysis += `with a low current ratio (${currentRatio.toFixed(2)}), indicating potential short-term liquidity challenges.`;
    }
    analysis += `</p>`;
    
    // Interest rate sensitivity analysis
    const changePercent = ((projectedDSCR - dscr) / dscr * 100).toFixed(1);
    analysis += `<p><strong>Interest Rate Sensitivity Analysis:</strong> If interest rates increase by 2%, the projected DSCR would become <strong>${projectedDSCR}</strong>, representing a ${changePercent}% change. `;
    
    if (projectedDSCR >= 1.25) {
        analysis += `Even with the interest rate increase, the company would maintain a healthy debt service coverage level, indicating low interest rate risk.</p>`;
    } else if (projectedDSCR >= 1.0) {
        analysis += `Following the interest rate increase, the company's debt service coverage would remain above the safety threshold, but with limited buffer capacity, suggesting moderate sensitivity to rate fluctuations.</p>`;
    } else {
        analysis += `Following the interest rate increase, the company's DSCR would fall to <strong>${projectedDSCR}</strong>, below the safety threshold of 1.0, indicating high interest rate risk and potential debt service challenges under higher rates.</p>`;
    }
    
    // Metrics correlation analysis
    analysis += `<p><strong>Metrics Correlation Analysis:</strong> `;
    
    // Since we now use the same value for both DSCR and debt service coverage ratio, this part is redundant
    // but we'll keep it with modified text to maintain the analysis structure
    analysis += `The company's DSCR of <strong>${dscr.toFixed(2)}x</strong> is derived from its financial performance and loan structure, serving as a key indicator of debt servicing capability.`;
    analysis += `</p>`;
    
    // Risk assessment and recommendations
    analysis += '<p><strong>Risk Assessment & Recommendations:</strong> ';
    if (dscrHealth === 'excellent' || dscrHealth === 'strong') {
        if (pd < 2.0 && leverageRatio < 0.4) {
            analysis += 'The company demonstrates strong debt servicing capacity, low default risk, and moderate leverage, positioning it as a high-quality loan candidate. Consider offering increased credit limits or more favorable loan terms.';
        } else {
            analysis += 'The company shows good DSCR performance, but attention should be paid to its higher leverage ratio or default probability. Maintain the existing lending relationship with regular monitoring of key financial indicators.';
        }
    } else if (dscrHealth === 'good') {
        if (roe > 10 && currentRatio > 1.5) {
            analysis += 'The company shows adequate debt servicing ability with good operational efficiency and short-term liquidity, representing a moderate-risk client. Maintain appropriate credit levels with periodic financial reviews.';
        } else {
            analysis += 'The company\'s DSCR is at an acceptable level, but profitability or short-term liquidity raises some concerns. Implement more stringent loan monitoring and regular financial reviews.';
        }
    } else if (dscrHealth === 'adequate') {
        analysis += 'The company\'s DSCR is approaching the critical threshold, and other financial indicators suggest limited repayment capacity. Consider requiring additional collateral, implementing stricter financial covenants, and closely monitoring debt performance.';
    } else {
        analysis += 'The company\'s DSCR is insufficient, and other indicators reveal significant credit risk. Recommend reassessing current loan terms, considering debt restructuring or additional collateral, or even reducing exposure to control risk.';
    }
    analysis += '</p>';
    
    return {
        analysis: analysis,
        dscrHealth: dscrHealth
    };
}

// Make sure the chart is created with the correct DSCR value
function createDSCRChart(chartId, data) {
    // Use the company's Debt Service Coverage Ratio value directly for the chart
    const chartContainer = document.getElementById(chartId);
    if (!chartContainer) return;
    
    // Clear any existing content
    chartContainer.innerHTML = '';
    
    // Chart dimensions
    const margin = { top: 30, right: 40, bottom: 50, left: 70 };
    const width = chartContainer.clientWidth - margin.left - margin.right;
    const height = chartContainer.clientHeight - margin.top - margin.bottom;
    
    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', chartContainer.clientWidth);
    svg.setAttribute('height', chartContainer.clientHeight);
    svg.setAttribute('class', 'dscr-chart-svg');
    chartContainer.appendChild(svg);
    
    // Add a background for better appearance
    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', chartContainer.clientWidth);
    background.setAttribute('height', chartContainer.clientHeight);
    background.setAttribute('fill', '#f8fafc');
    background.setAttribute('rx', '8');
    svg.appendChild(background);
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
    svg.appendChild(g);
    
    // X scale
    const xMax = Math.max(data.companyDSCR, data.industryAvg, data.projectedDSCR, data.industryMax) * 1.1;
    
    // Create bars
    const barHeight = 30;
    const barSpacing = 50;
    
    // Add chart title
    const chartTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    chartTitle.setAttribute('x', width / 2);
    chartTitle.setAttribute('y', 0);
    chartTitle.setAttribute('text-anchor', 'middle');
    chartTitle.setAttribute('font-size', '14');
    chartTitle.setAttribute('font-weight', 'bold');
    chartTitle.setAttribute('fill', '#333');
    chartTitle.textContent = 'DSCR Analysis';
    g.appendChild(chartTitle);
    
    // Add grid background
    for (let i = 0; i <= 5; i++) {
        const x = (i / 5) * width;
        const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        gridLine.setAttribute('x1', x);
        gridLine.setAttribute('y1', 20);
        gridLine.setAttribute('x2', x);
        gridLine.setAttribute('y2', barSpacing * 4);
        gridLine.setAttribute('stroke', '#e2e8f0');
        gridLine.setAttribute('stroke-width', '1');
        g.appendChild(gridLine);
    }
    
    // Add DSCR = 1 reference line
    const refLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const refX = (1 / xMax) * width;
    refLine.setAttribute('x1', refX);
    refLine.setAttribute('y1', 20);
    refLine.setAttribute('x2', refX);
    refLine.setAttribute('y2', barSpacing * 4);
    refLine.setAttribute('stroke', '#dc3545');
    refLine.setAttribute('stroke-width', '1.5');
    refLine.setAttribute('stroke-dasharray', '4');
    g.appendChild(refLine);
    
    // Add reference text
    const refText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    refText.setAttribute('x', refX + 5);
    refText.setAttribute('y', 35);
    refText.setAttribute('fill', '#dc3545');
    refText.setAttribute('font-size', '12');
    refText.setAttribute('font-weight', 'bold');
    refText.textContent = 'DSCR = 1';
    g.appendChild(refText);
    
    // Add a background for the legend
    const legendBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    legendBg.setAttribute('x', width - 140);
    legendBg.setAttribute('y', 20);
    legendBg.setAttribute('width', 140);
    legendBg.setAttribute('height', 75);
    legendBg.setAttribute('fill', 'white');
    legendBg.setAttribute('stroke', '#e2e8f0');
    legendBg.setAttribute('stroke-width', '1');
    legendBg.setAttribute('rx', '4');
    g.appendChild(legendBg);
    
    // Add legend title
    const legendTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    legendTitle.setAttribute('x', width - 130);
    legendTitle.setAttribute('y', 35);
    legendTitle.setAttribute('font-size', '12');
    legendTitle.setAttribute('font-weight', 'bold');
    legendTitle.setAttribute('fill', '#333');
    legendTitle.textContent = 'Legend';
    g.appendChild(legendTitle);
    
    // Add legend items
    const legendItems = [
        { color: '#4a6fdc', text: 'Company' },
        { color: '#6c757d', text: 'Industry Avg' },
        { color: '#ffc107', text: 'Rate +2%' }
    ];
    
    legendItems.forEach((item, index) => {
        const y = 50 + index * 15;
        
        // Add color box
        const colorBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        colorBox.setAttribute('x', width - 130);
        colorBox.setAttribute('y', y - 8);
        colorBox.setAttribute('width', 10);
        colorBox.setAttribute('height', 10);
        colorBox.setAttribute('fill', item.color);
        colorBox.setAttribute('rx', '2');
        g.appendChild(colorBox);
        
        // Add text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', width - 115);
        text.setAttribute('y', y);
        text.setAttribute('font-size', '11');
        text.setAttribute('fill', '#333');
        text.textContent = item.text;
        g.appendChild(text);
    });
    
    // Create current DSCR bar
    const companyBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    companyBar.setAttribute('class', 'dscr-bar company');
    companyBar.setAttribute('x', 0);
    companyBar.setAttribute('y', barSpacing * 1);
    companyBar.setAttribute('width', 0); // Start at 0 for animation
    companyBar.setAttribute('height', barHeight);
    companyBar.setAttribute('rx', 4);
    g.appendChild(companyBar);
    
    // Animate width
    setTimeout(() => {
        companyBar.setAttribute('width', (data.companyDSCR / xMax) * width);
    }, 100);
    
    // Add bar shadow
    const companyShadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    companyShadow.setAttribute('x', 0);
    companyShadow.setAttribute('y', barSpacing * 1 + 3);
    companyShadow.setAttribute('width', (data.companyDSCR / xMax) * width);
    companyShadow.setAttribute('height', barHeight);
    companyShadow.setAttribute('rx', 4);
    companyShadow.setAttribute('fill', 'none');
    companyShadow.setAttribute('filter', 'drop-shadow(0px 2px 3px rgba(0,0,0,0.2))');
    g.appendChild(companyShadow);
    
    // Create company DSCR label
    const companyText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    companyText.setAttribute('x', 5);
    companyText.setAttribute('y', barSpacing * 1 + barHeight / 2 + 5);
    companyText.setAttribute('fill', 'white');
    companyText.setAttribute('font-size', '12');
    companyText.setAttribute('font-weight', 'bold');
    companyText.textContent = `${data.companyDSCR.toFixed(2)}`;
    g.appendChild(companyText);
    
    // Create company DSCR label
    const companyLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    companyLabel.setAttribute('x', -5);
    companyLabel.setAttribute('y', barSpacing * 1 + barHeight / 2 + 5);
    companyLabel.setAttribute('text-anchor', 'end');
    companyLabel.setAttribute('fill', '#333');
    companyLabel.setAttribute('font-size', '12');
    companyLabel.setAttribute('font-weight', 'bold');
    companyLabel.textContent = 'Current';
    g.appendChild(companyLabel);
    
    // Create industry average bar
    const industryBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    industryBar.setAttribute('class', 'dscr-bar industry');
    industryBar.setAttribute('x', 0);
    industryBar.setAttribute('y', barSpacing * 2);
    industryBar.setAttribute('width', 0); // Start at 0 for animation
    industryBar.setAttribute('height', barHeight);
    industryBar.setAttribute('rx', 4);
    g.appendChild(industryBar);
    
    // Animate width
    setTimeout(() => {
        industryBar.setAttribute('width', (data.industryAvg / xMax) * width);
    }, 300);
    
    // Add bar shadow
    const industryShadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    industryShadow.setAttribute('x', 0);
    industryShadow.setAttribute('y', barSpacing * 2 + 3);
    industryShadow.setAttribute('width', (data.industryAvg / xMax) * width);
    industryShadow.setAttribute('height', barHeight);
    industryShadow.setAttribute('rx', 4);
    industryShadow.setAttribute('fill', 'none');
    industryShadow.setAttribute('filter', 'drop-shadow(0px 2px 3px rgba(0,0,0,0.2))');
    g.appendChild(industryShadow);
    
    // Create industry label
    const industryText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    industryText.setAttribute('x', 5);
    industryText.setAttribute('y', barSpacing * 2 + barHeight / 2 + 5);
    industryText.setAttribute('fill', 'white');
    industryText.setAttribute('font-size', '12');
    industryText.setAttribute('font-weight', 'bold');
    industryText.textContent = `${data.industryAvg.toFixed(2)}`;
    g.appendChild(industryText);
    
    // Create industry label
    const industryLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    industryLabel.setAttribute('x', -5);
    industryLabel.setAttribute('y', barSpacing * 2 + barHeight / 2 + 5);
    industryLabel.setAttribute('text-anchor', 'end');
    industryLabel.setAttribute('fill', '#333');
    industryLabel.setAttribute('font-size', '12');
    industryLabel.setAttribute('font-weight', 'bold');
    industryLabel.textContent = 'Industry';
    g.appendChild(industryLabel);
    
    // Create projected DSCR bar
    const projectedBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    projectedBar.setAttribute('class', 'dscr-bar projected');
    projectedBar.setAttribute('x', 0);
    projectedBar.setAttribute('y', barSpacing * 3);
    projectedBar.setAttribute('width', 0); // Start at 0 for animation
    projectedBar.setAttribute('height', barHeight);
    projectedBar.setAttribute('rx', 4);
    g.appendChild(projectedBar);
    
    // Animate width
    setTimeout(() => {
        projectedBar.setAttribute('width', (data.projectedDSCR / xMax) * width);
    }, 500);
    
    // Add bar shadow
    const projectedShadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    projectedShadow.setAttribute('x', 0);
    projectedShadow.setAttribute('y', barSpacing * 3 + 3);
    projectedShadow.setAttribute('width', (data.projectedDSCR / xMax) * width);
    projectedShadow.setAttribute('height', barHeight);
    projectedShadow.setAttribute('rx', 4);
    projectedShadow.setAttribute('fill', 'none');
    projectedShadow.setAttribute('filter', 'drop-shadow(0px 2px 3px rgba(0,0,0,0.2))');
    g.appendChild(projectedShadow);
    
    // Create projected DSCR label
    const projectedText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    projectedText.setAttribute('x', 5);
    projectedText.setAttribute('y', barSpacing * 3 + barHeight / 2 + 5);
    projectedText.setAttribute('fill', '#333');
    projectedText.setAttribute('font-size', '12');
    projectedText.setAttribute('font-weight', 'bold');
    projectedText.textContent = `${data.projectedDSCR.toFixed(2)}`;
    g.appendChild(projectedText);
    
    // Create projected label
    const projectedLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    projectedLabel.setAttribute('x', -5);
    projectedLabel.setAttribute('y', barSpacing * 3 + barHeight / 2 + 5);
    projectedLabel.setAttribute('text-anchor', 'end');
    projectedLabel.setAttribute('fill', '#333');
    projectedLabel.setAttribute('font-size', '12');
    projectedLabel.setAttribute('font-weight', 'bold');
    projectedLabel.textContent = 'Rate +2%';
    g.appendChild(projectedLabel);
    
    // Add x-axis
    const xAxisG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    xAxisG.setAttribute('transform', `translate(0,${barSpacing * 4})`);
    g.appendChild(xAxisG);
    
    // Add x-axis line
    const xAxisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxisLine.setAttribute('x1', 0);
    xAxisLine.setAttribute('y1', 0);
    xAxisLine.setAttribute('x2', width);
    xAxisLine.setAttribute('y2', 0);
    xAxisLine.setAttribute('stroke', '#6b7280');
    xAxisLine.setAttribute('stroke-width', '1.5');
    xAxisG.appendChild(xAxisLine);
    
    // Add x-axis labels
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
        const x = (i / ticks) * width;
        const value = (i / ticks * xMax).toFixed(1);
        
        // Add tick
        const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tick.setAttribute('x1', x);
        tick.setAttribute('y1', 0);
        tick.setAttribute('x2', x);
        tick.setAttribute('y2', 6);
        tick.setAttribute('stroke', '#6b7280');
        tick.setAttribute('stroke-width', '1.5');
        xAxisG.appendChild(tick);
        
        // Add label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', 22);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', '#4b5563');
        label.setAttribute('font-size', '11');
        label.textContent = value;
        xAxisG.appendChild(label);
    }
    
    // Add x-axis title
    const xAxisTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xAxisTitle.setAttribute('x', width / 2);
    xAxisTitle.setAttribute('y', 42);
    xAxisTitle.setAttribute('text-anchor', 'middle');
    xAxisTitle.setAttribute('fill', '#1f2937');
    xAxisTitle.setAttribute('font-size', '12');
    xAxisTitle.setAttribute('font-weight', 'bold');
    xAxisTitle.textContent = 'Debt Service Coverage Ratio (DSCR)';
    xAxisG.appendChild(xAxisTitle);
}

function updateDSCRAnalysis(companyIndex, companyData) {
    // Get necessary DOM elements
    const dscrValueElement = document.querySelector(`#company-detail-${companyIndex} .dscr-value`);
    const dscrIndustryAvgElement = document.querySelector(`#company-detail-${companyIndex} .dscr-industry-avg`);
    const interestRateElement = document.querySelector(`#company-detail-${companyIndex} .current-interest-rate`);
    const dscrProjectedElement = document.querySelector(`#company-detail-${companyIndex} .dscr-projected`);
    const dscrAnalysisElement = document.getElementById(`dscr-analysis-${companyIndex}`);
    const chartId = `dscr-chart-${companyIndex}`;
    
    if (!dscrValueElement || !dscrIndustryAvgElement || !interestRateElement || 
        !dscrProjectedElement || !dscrAnalysisElement) {
        console.error('Required DOM elements not found for DSCR analysis');
        return;
    }
    
    // Set base interest rate
    const currentInterestRate = 0.05; // 5%
    const projectedInterestRate = 0.07; // 7% (5% + 2%)
    
    // Get current DSCR from financial metrics
    const currentDSCR = companyData['Debt Service Coverage Ratio'];
    
    // Calculate projected DSCR
    const projectedDSCR = calculateDSCR(companyData, projectedInterestRate);
    
    // Get industry average DSCR
    const industryAvg = getIndustryAverageDSCR(companyData.Industry);
    const industryRange = getIndustryMinMaxDSCR(companyData.Industry);
    
    // Update display values
    dscrValueElement.textContent = currentDSCR.toFixed(2);
    dscrIndustryAvgElement.textContent = industryAvg.toFixed(2);
    interestRateElement.textContent = `${(currentInterestRate * 100).toFixed(1)}%`;
    dscrProjectedElement.textContent = projectedDSCR.toFixed(2);
    
    // Apply color class based on DSCR value
    if (currentDSCR >= 1.5) {
        dscrValueElement.className = 'metric-value dscr-value healthy';
    } else if (currentDSCR >= 1.0) {
        dscrValueElement.className = 'metric-value dscr-value caution';
    } else {
        dscrValueElement.className = 'metric-value dscr-value risk';
    }
    
    // Generate analysis text
    const analysis = analyzeDSCR(currentDSCR, industryAvg, projectedDSCR, companyData);
    dscrAnalysisElement.innerHTML = analysis.analysis;
    
    // Create visualization
    createDSCRChart(chartId, {
        companyDSCR: currentDSCR,
        industryAvg: industryAvg,
        projectedDSCR: projectedDSCR,
        industryMin: industryRange.min,
        industryMax: industryRange.max
    });
}

// Add DSCR analysis to company detail modal events
document.addEventListener('DOMContentLoaded', function() {
    // Handle the existing modal open event to initialize DSCR analysis
    const originalShowCompanyDetails = window.showCompanyDetails;
    
    if (typeof originalShowCompanyDetails === 'function') {
        window.showCompanyDetails = function(companyName) {
            // Call the original function
            originalShowCompanyDetails(companyName);
            
            // Add DSCR analysis
            const companyList = JSON.parse(document.querySelector('script:not([src])').innerText.match(/JSON\.parse\('(.*?)'\)/)[1]);
            const companyIndex = companyList.findIndex(c => c.Company === companyName) + 1;
            
            if (companyIndex > 0) {
                const companyData = companyList[companyIndex - 1];
                setTimeout(() => {
                    updateDSCRAnalysis(companyIndex, companyData);
                }, 100);
            }
        };
    } else {
        console.error('Original showCompanyDetails function not found');
    }
});
