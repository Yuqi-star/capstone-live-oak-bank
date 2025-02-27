// static/script.js
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
    const searchBtn = document.getElementById('searchBtn');
    const selectAllCheckbox = document.getElementById('selectAll');
    const industryCheckboxes = document.querySelectorAll('input[name="industry"]');
    
    console.log("Search input:", searchInput);
    console.log("Select all checkbox:", selectAllCheckbox);
    console.log("Industry checkboxes:", industryCheckboxes.length);
    
    // Initialize checkbox states
    function initializeCheckboxes() {
        console.log("Initializing checkboxes");
        const params = new URLSearchParams(window.location.search);
        const selectedIndustries = params.getAll('industries');
        
        // 修改这里：首次加载时默认选中所有行业
        if (selectedIndustries.length === 0) {
            selectAllCheckbox.checked = true;
            industryCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
            // Update URL to include all industries
            handleSearch();
        } else {
            // Set checkboxes based on URL parameters
            industryCheckboxes.forEach(checkbox => {
                checkbox.checked = selectedIndustries.includes(checkbox.value);
            });
            // Only check SelectAll if all industries are selected
            selectAllCheckbox.checked = Array.from(industryCheckboxes).every(cb => cb.checked);
        }
    }
    
    // Handle search and filtering
    function handleSearch() {
        const searchQuery = searchInput.value.trim();
        const selectedIndustries = Array.from(industryCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
            
        const params = new URLSearchParams(window.location.search);
        params.delete('search');
        params.delete('industries');
        
        if (searchQuery) {
            params.append('search', searchQuery);
            // Uncheck all industries when searching
            industryCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            selectAllCheckbox.checked = false;
        }
        
        // Add selected industries to parameters
        selectedIndustries.forEach(industry => {
            params.append('industries', industry);
        });
        
        // Keep username parameter
        const username = new URLSearchParams(window.location.search).get('username');
        if (username) {
            params.append('username', username);
        }
        
        // Reload page to update news
        window.location.href = `/dashboard?${params.toString()}`;
    }
    
    // Handle Select All checkbox functionality
    selectAllCheckbox.addEventListener('change', function() {
        // 修改这里：切换所有复选框的状态
        const newState = this.checked;
        industryCheckboxes.forEach(checkbox => {
            checkbox.checked = newState;
        });
        
        // Update search results immediately
        handleSearch();
    });
    
    // Update Select All checkbox when individual checkboxes change
    industryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // Check if all checkboxes are checked
            selectAllCheckbox.checked = Array.from(industryCheckboxes).every(cb => cb.checked);
            
            // Update search results
            handleSearch();
        });
    });
    
    // 搜索按钮点击事件
    searchBtn.addEventListener('click', handleSearch);
    
    // 回车键搜索
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // 当开始搜索时，取消所有行业选择
    searchInput.addEventListener('input', function() {
        const searchQuery = this.value.trim();
        
        // 移除所有已存在的 "Add to tracked industries" 按钮
        const existingButtons = this.parentNode.querySelectorAll('.add-to-tracked-btn');
        existingButtons.forEach(button => button.remove());
        
        if (searchQuery) {
            selectAllCheckbox.checked = false;
            industryCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        }
    });
    
    // Initialize when page loads
    initializeCheckboxes();

    // Format date and time to be more readable
    function formatDateTime(timestamp) {
        if (!timestamp) return "N/A";
        
        try {
            // Parse timestamp format: 20250226T234100
            const year = timestamp.slice(0, 4);
            const month = parseInt(timestamp.slice(4, 6)) - 1; // JS months are 0-indexed
            const day = timestamp.slice(6, 8);
            const hour = timestamp.slice(9, 11);
            const minute = timestamp.slice(11, 13);
            
            const date = new Date(year, month, day, hour, minute);
            
            // Format as "Feb 26, 2025 11:41 PM"
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            console.error("Error formatting date:", e);
            return timestamp; // Return original if parsing fails
        }
    }

    // Apply formatting to all news timestamps
    document.querySelectorAll('.news-time').forEach(timeElement => {
        const originalTime = timeElement.dataset.time;
        timeElement.textContent = formatDateTime(originalTime);
    });

    // Update timestamps every minute to keep relative times fresh
    setInterval(() => {
        document.querySelectorAll('.news-time').forEach(timeElement => {
            const originalTime = timeElement.dataset.time;
            timeElement.textContent = formatDateTime(originalTime);
        });
    }, 60000); // Update every minute

    // Handle topic click
    function handleTopicClick(topic) {
        document.getElementById('newIndustry').value = topic;
        document.getElementById('addIndustryBtn').click();
    }

    // Add random but consistent colors for topics
    const topicColors = {};
    const hueStep = 360 / document.querySelectorAll('.topic-tag').length;
    let hue = 0;

    document.querySelectorAll('.topic-tag').forEach(tag => {
        const topic = tag.textContent.trim();
        if (!topicColors[topic]) {
            topicColors[topic] = `hsl(${hue}, 85%, 96%)`;
            hue += hueStep;
        }
        tag.style.backgroundColor = topicColors[topic];
    });

    // 搜索功能
    const searchBox = searchInput.parentElement;
    let suggestionsContainer = null;

    // 创建搜索建议容器
    function createSuggestionsContainer() {
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'search-suggestions';
            searchBox.appendChild(suggestionsContainer);
        }
    }

    // 处理搜索输入
    searchInput.addEventListener('input', function() {
        const searchQuery = this.value.trim();
        
        if (searchQuery) {
            // 创建并显示搜索建议
            createSuggestionsContainer();
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.classList.add('active');

            // 创建搜索建议项
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.innerHTML = `
                <span>${searchQuery}</span>
                <button class="add-to-tracked">Add to tracked</button>
            `;

            // 点击建议项直接搜索
            suggestionItem.addEventListener('click', function() {
                searchInput.value = searchQuery;
                handleSearch();
                suggestionsContainer.classList.remove('active');
            });

            // 点击"Add to tracked"按钮添加到跟踪行业
            suggestionItem.querySelector('.add-to-tracked').addEventListener('click', function(e) {
                e.stopPropagation();
                document.getElementById('newIndustry').value = searchQuery;
                document.getElementById('addIndustryBtn').click();
                suggestionsContainer.classList.remove('active');
            });

            suggestionsContainer.appendChild(suggestionItem);
        } else {
            // 清空搜索时隐藏建议
            if (suggestionsContainer) {
                suggestionsContainer.classList.remove('active');
            }
        }
    });

    // 点击页面其他地方时隐藏建议
    document.addEventListener('click', function(e) {
        if (!searchBox.contains(e.target) && suggestionsContainer) {
            suggestionsContainer.classList.remove('active');
        }
    });

    // Add industry functionality with duplicate check
    const addIndustryBtn = document.createElement('button');
    addIndustryBtn.className = 'add-industry-btn disabled';
    addIndustryBtn.textContent = 'Add Industry';
    
    // 创建搜索框包装器
    const searchBoxWrapper = document.createElement('div');
    searchBoxWrapper.className = 'search-box-wrapper';
    searchInput.parentNode.insertBefore(searchBoxWrapper, searchInput);
    searchBoxWrapper.appendChild(searchInput);
    searchBoxWrapper.appendChild(addIndustryBtn);

    // 处理搜索输入
    searchInput.addEventListener('input', function() {
        const searchQuery = this.value.trim();
        
        // 更新添加行业按钮状态
        if (searchQuery) {
            addIndustryBtn.classList.remove('disabled');
        } else {
            addIndustryBtn.classList.add('disabled');
        }
        
        // 取消所有行业选中状态
        industryCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        selectAllCheckbox.checked = false;
        
        // 立即执行搜索
        handleSearch();
    });

    // 处理添加行业按钮点击
    addIndustryBtn.addEventListener('click', function() {
        const searchQuery = searchInput.value.trim();
        if (!searchQuery || this.classList.contains('disabled')) return;

        // Check if industry already exists
        const existingIndustries = Array.from(document.querySelectorAll('.industry-checkbox'))
            .map(label => label.textContent.trim().toLowerCase());
        
        if (existingIndustries.includes(searchQuery.toLowerCase())) {
            alert('This industry is already in your list');
            return;
        }

        // Add new industry to database
        const username = new URLSearchParams(window.location.search).get('username');
        fetch(`/add_industry?username=${username}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `industry=${encodeURIComponent(searchQuery)}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Refresh page to show new industry
                location.reload();
            } else {
                alert(data.error);
            }
        })
        .catch(error => console.error('Error:', error));
    });
});

// Delete industry functionality
document.querySelectorAll('.delete-industry').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const industry = this.dataset.industry;
        const username = new URLSearchParams(window.location.search).get('username');
        
        if (confirm(`Are you sure you want to remove "${industry}" from your tracked industries?`)) {
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
                    // Remove industry checkbox
                    this.closest('.industry-checkbox').remove();
                    // Update search results
                    handleSearch();
                } else {
                    alert(data.error);
                }
            })
            .catch(error => console.error('Error:', error));
        }
    });
});
