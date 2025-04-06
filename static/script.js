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
    console.log("Running submitReport function");
    
    // Show loading indicator
    showLoading("Generating report...");
    
    const form = document.getElementById('reportForm');
    if (!form) {
        console.error("Report form not found");
        hideLoading();
        return;
    }
    
    // Get all checked sections checkboxes
    const sectionsCheckboxes = form.querySelectorAll('input[name="sections"]:checked');
    const sections = Array.from(sectionsCheckboxes).map(cb => cb.value);
    
    const formData = new FormData(form);
    const data = {
        company_name: formData.get('company_name'),
        sections: sections,
        schedule: formData.get('schedule'),
        delivery_email: formData.get('delivery_email') === 'on',
        delivery_download: formData.get('delivery_download') === 'on' || true, // Default to true if not specified
        email: formData.get('email')
    };
    
    console.log("Report data:", data);

    // Validate form
    if (!data.company_name) {
        hideLoading();
        showNotification('Please select a company', 'error');
        return;
    }
    
    if (sections.length === 0) {
        hideLoading();
        showNotification('Please select at least one report section', 'error');
        return;
    }

    if (data.delivery_email && !data.email) {
        hideLoading();
        showNotification('Please provide an email address for email delivery', 'error');
        return;
    }
    
    // Check that at least one delivery method is selected
    if (!data.delivery_email && !data.delivery_download) {
        hideLoading();
        showNotification('Please select at least one delivery method', 'error');
        return;
    }

    // Submit report request
    fetch('/api/generate_report', {
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
            let scheduleText = '';
            if (data.schedule !== 'once') {
                scheduleText = ` (${data.schedule} schedule)`;
            }
            
            showNotification(`Report for ${data.company_name} generated successfully${scheduleText}`, 'success');
            
            // Close modal
            const modalElement = document.getElementById('reportModal');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) {
                modalInstance.hide();
            }
            
            form.reset();
            
            // If download URL is provided, trigger download after a brief delay
            if (result.download_url) {
                setTimeout(() => {
                    console.log("Opening download URL:", result.download_url);
                    window.location.href = result.download_url;
                }, 500);
            }
        } else {
            showNotification(result.message || 'Error generating report', 'error');
        }
    })
    .catch(error => {
        hideLoading();
        showNotification('Error generating report: ' + error.message, 'error');
        console.error('Error:', error);
    });
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
    console.log("Opening report modal for:", companyName);
    
    // Set company name in the modal title and form
    document.querySelectorAll('#reportModal .company-name').forEach(function(element) {
        element.textContent = companyName;
    });
    document.getElementById('reportCompanyName').value = companyName;
    
    // Get the modal element
    const modalElement = document.getElementById('reportModal');
    
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
