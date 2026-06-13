const categoryNames = {
    synth: "Синтезатор",
    rompler: "Ромплер/Семплер",
    guitar: "Гитара",
    piano: "Пианино",
    eq: "Эквалайзер",
    compressor: "Компрессор",
    reverb: "Реверб",
    delay: "Дилей",
    satur: "Сатуратор",
    drums: "Барабаны",
    vocal: "Вокал",
    various: "Разное",
};

const typeNames = {
    plugin: "Плагин",
    samplepack: "Семпл пак",
    presetSerum: "Пресеты на Серум",
    libsKontakt: "Библиотеки на Контакт",
    courses: "Курсы",
    bundle: "Набор плагинов",
    daw: "DAW"
};

const pluginsGrid = document.getElementById('pluginsGrid');
const searchInput = document.getElementById('searchInput');
const searchSuggestions = document.getElementById('searchSuggestions');

let activeFilters = {
    type: ['all'],
    category: ['all']
};

let pendingDownload = {
    torrentUrl: null,
    pluginName: null,
    guideUrl: null,
    versions: null
};

let plugins = [];

async function loadPlugins() {
    try {
        const response = await fetch('plugins.json');
        if (!response.ok) {
            throw new Error('Не удалось загрузить plugins.json');
        }
        let data = await response.json();
        
        plugins = data.map(plugin => ({
            ...plugin,
            rawsize: Number(plugin.rawsize) || 0
        }));

        initializeApp();
    } catch (error) {
        plugins = [];
        initializeApp();
    }
}

function initializeApp() {
    displayPlugins(plugins);
    setupSearchSuggestions();
    initFilters();
    initCustomScrollbars();
}

function getSizeClass(sizeMB) {
    const size = Number(sizeMB) || 0;
    if (size < 100) return 'size-small';
    if (size < 5000) return 'size-medium';
    if (size < 20000) return 'size-large';
    if (size < 50000) return 'size-xlarge';
    return 'size-xxlarge';
}

function createModal() {
    if (document.getElementById('downloadModal')) return;
    
    const modalHtml = `
        <div class="modal-overlay" id="downloadModal">
            <div class="modal">
                <h3 class="modal-title" id="modalTitle">Скачать</h3>
                <p class="modal-message" id="modalMessage"></p>
                
                <div class="version-select-wrapper" id="versionSelectWrapper" style="display: none; position: relative;">
                    <span class="version-select-label">Выберите версию:</span>
                    <button class="version-select-trigger" id="versionSelectTrigger" type="button">
                        <span id="selectedVersionText">Выберите версию</span>
                        <span class="arrow">▼</span>
                    </button>
                    <ul class="version-dropdown" id="versionDropdown"></ul>
                </div>
                
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-primary" id="modalWatchGuide" style="display: none;">
                        Смотреть гайд
                    </button>
                    <button class="modal-btn modal-btn-secondary" id="modalDownloadBtn">
                        Скачать
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById('downloadModal');
    const trigger = document.getElementById('versionSelectTrigger');
    const dropdown = document.getElementById('versionDropdown');
    const watchGuideBtn = document.getElementById('modalWatchGuide');
    const downloadBtn = document.getElementById('modalDownloadBtn');

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        if (dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
            trigger.classList.remove('active');
        } else {
            dropdown.classList.add('show');
            trigger.classList.add('active');
        }
    });

    document.addEventListener('click', function(e) {
        if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
            trigger.classList.remove('active');
        }
    });

    watchGuideBtn.addEventListener('click', function() {
        if (pendingDownload.guideUrl) {
            window.open(pendingDownload.guideUrl, '_blank');
        }
        startDownload();
        closeModal();
    });

    downloadBtn.addEventListener('click', function() {
        startDownload();
        closeModal();
    });
}

function startDownload() {
    let urlToDownload = null;

    if (pendingDownload.versions && pendingDownload.versions.length > 0) {
        const selectedOption = document.querySelector('.version-option.selected');
        if (selectedOption && selectedOption.dataset.url) {
            urlToDownload = selectedOption.dataset.url;
        } else {
            urlToDownload = pendingDownload.versions[0].url;
        }
    } else if (pendingDownload.torrentUrl) {
        urlToDownload = pendingDownload.torrentUrl;
    }
    
    if (urlToDownload) {
        window.open(urlToDownload, '_blank');
    }
}

function renderVersionDropdown(versions) {
    const dropdown = document.getElementById('versionDropdown');
    const selectedText = document.getElementById('selectedVersionText');
    
    if (!versions || versions.length === 0) return;
    
    dropdown.innerHTML = '';
    
    versions.forEach(function(version) {
        const li = document.createElement('li');
        li.className = 'version-option';
        li.setAttribute('data-url', version.url);
        li.innerHTML = `
            <span>${version.label}</span>
            <span class="check-icon">✓</span>
        `;
        
        li.addEventListener('click', function(e) {
            e.stopPropagation();
            
            const allOptions = dropdown.querySelectorAll('.version-option');
            allOptions.forEach(function(opt) {
                opt.classList.remove('selected');
            });

            li.classList.add('selected');
            selectedText.textContent = version.label;

            document.getElementById('versionSelectTrigger').classList.remove('active');
            dropdown.classList.remove('show');
        });
        
        dropdown.appendChild(li);
    });

    const firstOption = dropdown.querySelector('.version-option');
    if (firstOption) {
        firstOption.classList.add('selected');
        selectedText.textContent = versions[0].label;
    }
}

function showModal(pluginName, torrentUrl, guideUrl, versions) {
    createModal();

    pendingDownload = {
        torrentUrl: torrentUrl || null,
        pluginName: pluginName,
        guideUrl: guideUrl || null,
        versions: versions || null
    };
    
    const modal = document.getElementById('downloadModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const versionWrapper = document.getElementById('versionSelectWrapper');
    const watchGuideBtn = document.getElementById('modalWatchGuide');
    const downloadBtn = document.getElementById('modalDownloadBtn');

    modalTitle.textContent = pluginName;

    if (versions && versions.length > 1) {
        versionWrapper.style.display = 'block';
        modalMessage.textContent = 'Доступно несколько версий. Выберите нужную:';
        renderVersionDropdown(versions);
    } else if (versions && versions.length === 1) {
        versionWrapper.style.display = 'none';
        modalMessage.textContent = 'Нажмите кнопку ниже для скачивания';
    } else {
        versionWrapper.style.display = 'none';
        if (guideUrl) {
            modalMessage.textContent = 'Для этого плагина есть видео-гайд по установке. Хотите посмотреть?';
        } else {
            modalMessage.textContent = 'Нажмите кнопку ниже для скачивания';
        }
    }

    if (guideUrl) {
        watchGuideBtn.style.display = 'flex';
        downloadBtn.textContent = 'Только скачать';
    } else {
        watchGuideBtn.style.display = 'none';
        downloadBtn.textContent = 'Скачать';
    }
    
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('downloadModal');
    if (!modal) return;
    
    modal.classList.add('closing');
    modal.classList.remove('active');
    
    setTimeout(function() {
        modal.classList.remove('closing');
        pendingDownload = {
            torrentUrl: null,
            pluginName: null,
            guideUrl: null,
            versions: null
        };
    }, 300);
}

function handleDownloadClick(button) {
    const pluginName = button.getAttribute('data-name');
    const torrentUrl = button.getAttribute('data-torrent');
    const guideUrl = button.getAttribute('data-guide');
    const versionsJson = button.getAttribute('data-versions');
    
    let versions = null;
    
    if (versionsJson && versionsJson.trim() !== '') {
        try {
            versions = JSON.parse(versionsJson.replace(/&#39;/g, "'"));
        } catch (e) {
            console.error('Ошибка парсинга versions:', e);
        }
    }
    
    const hasVersions = versions && Array.isArray(versions) && versions.length > 0;
    const hasGuide = guideUrl && guideUrl !== 'null' && guideUrl !== '';
    
    if (hasVersions || hasGuide) {
        showModal(
            pluginName,
            hasVersions ? null : torrentUrl,
            hasGuide ? guideUrl : null,
            hasVersions ? versions : null
        );
    } else {
        if (torrentUrl && torrentUrl !== '') {
            window.open(torrentUrl, '_blank');
        }
    }
}

function displayPlugins(pluginsToShow) {
    if (!pluginsGrid) return;
    
    pluginsGrid.innerHTML = '';
    
    if (pluginsToShow.length === 0) {
        showEmptyStateMessage();
        return;
    }

    pluginsToShow.forEach((plugin, index) => {
        const pluginCard = document.createElement('div');
        pluginCard.className = 'plugin-card glass-effect fade-in';
        pluginCard.style.animationDelay = `${index * 0.08}s`;
        
        const sizeClass = getSizeClass(plugin.rawsize);
        
        pluginCard.innerHTML = `
            <div class="plugin-image-container">
                <img src="${plugin.image}" alt="${plugin.name}" class="plugin-image" 
                    onerror="this.classList.add('error')">
            </div>
            <div class="plugin-info">
                <h3 class="plugin-name">${plugin.name}</h3>
                <p class="plugin-description">${plugin.description}</p>
                <div class="plugin-meta">
                    <span class="plugin-category">${typeNames[plugin.type]} • ${categoryNames[plugin.category]}</span>
                    <span class="plugin-size ${sizeClass}">${plugin.size}</span>
                </div>
                <button class="btn-download" 
                    data-name="${plugin.name.replace(/"/g, '&quot;')}"
                    data-torrent="${plugin.torrentUrl || ''}"
                    data-guide="${plugin.guideUrl || ''}"
                    data-versions='${plugin.versions ? JSON.stringify(plugin.versions).replace(/'/g, "&#39;") : ''}'
                    onclick="handleDownloadClick(this)">
                    Скачать
                </button>
            </div>
        `;
        
        pluginsGrid.appendChild(pluginCard);
    });
}

function showEmptyStateMessage() {
    if (!pluginsGrid) return;
    
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state glass-effect';
    
    const message = getEmptyStateMessage();
    
    emptyState.innerHTML = `
        <div class="empty-state-content">
            <div class="empty-state-icon">😔</div>
            <h3 class="empty-state-title">${message.title}</h3>
            <p class="empty-state-description">${message.description}</p>
            ${message.action ? `<button class="btn-empty-action" onclick="${message.action}">${message.buttonText}</button>` : ''}
        </div>
    `;
    
    pluginsGrid.appendChild(emptyState);
}

function getEmptyStateMessage() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const activeType = activeFilters.type.filter(t => t !== 'all');
    const activeCategory = activeFilters.category.filter(c => c !== 'all');
    
    if (searchTerm) {
        return {
            title: 'Ничего не найдено',
            description: `По запросу "${searchTerm}" ничего не найдено. Попробуйте изменить поисковый запрос или сбросить фильтры.`,
            buttonText: 'Сбросить поиск',
            action: "searchInput.value = ''; filterPlugins();"
        };
    }
    
    if (activeType.length > 0) {
        const typeName = typeNames[activeType[0]] || activeType[0];
        return {
            title: `${typeName} появятся скоро`,
            description: `В этой категории пока нет контента, но мы активно работаем над добавлением новых материалов.`,
            buttonText: 'Показать все плагины',
            action: "resetFilters();"
        };
    }
    
    if (activeCategory.length > 0) {
        const categoryName = categoryNames[activeCategory[0]] || activeCategory[0];
        return {
            title: `${categoryName} скоро будет`,
            description: `Материалы в категории "${categoryName}" скоро появятся. Следите за обновлениями!`,
            buttonText: 'Показать все категории',
            action: "resetFilters();"
        };
    }
    
    return {
        title: 'Плагины появятся скоро',
        description: 'Мы активно работаем над добавлением новых плагинов. Следите за обновлениями!',
        buttonText: 'Обновить страницу',
        action: "location.reload();"
    };
}

function getTypeDescription(type) {
    const descriptions = {
        plugin: 'плагинов',
        bundle: 'наборов плагинов',
        samplepack: 'семпл паков', 
        preset: 'пресетов'
    };
    return descriptions[type] || 'материалов';
}

function hideSearchSuggestions() {
    if (searchInput) searchInput.classList.remove('with-suggestions');
    if (searchSuggestions) searchSuggestions.classList.remove('show');
}

const translitMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
    'е': 'e', 'ё': 'e', 'ж': 'g', 'з': 'z', 'и': 'i',
    'й': 'j', 'к': 'c', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
    'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch',
    'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ы': 'y', 'ь': '',
    'э': 'e', 'ю': 'u', 'я': 'ya',
    ' ': ' ', '-': '-', '_': '_'
};

function transliterate(text) {
    return text.toLowerCase().split('').map(char => {
        return translitMap[char] || char;
    }).join('');
}

function levenshteinDistance(a, b) {
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[b.length][a.length];
}

function isSimilar(searchTerm, target, threshold = 0.7) {
    const longer = searchTerm.length > target.length ? searchTerm : target;
    const shorter = searchTerm.length > target.length ? target : searchTerm;

    if (longer.length - shorter.length > 3) return false;
    
    const distance = levenshteinDistance(searchTerm.toLowerCase(), target.toLowerCase());
    const similarity = 1 - (distance / longer.length);
    
    return similarity >= threshold;
}

function smartSearch(searchTerm, pluginsList) {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const searchLower = searchTerm.toLowerCase().trim();
    const transliterated = transliterate(searchLower);
    
    const results = pluginsList.filter(plugin => {
        const pluginName = plugin.name.toLowerCase();
        const pluginDesc = plugin.description.toLowerCase();

        if (pluginName.includes(searchLower) || pluginDesc.includes(searchLower)) {
            return true;
        }

        const translitName = transliterate(pluginName);
        const translitDesc = transliterate(pluginDesc);
        
        if (translitName.includes(transliterated) || translitDesc.includes(transliterated)) {
            return true;
        }

        const wordsInName = pluginName.split(/\s+/);
        const wordsInSearch = searchLower.split(/\s+/);

        for (const searchWord of wordsInSearch) {
            for (const nameWord of wordsInName) {
                if (isSimilar(searchWord, nameWord, 0.6)) {
                    return true;
                }
            }

            const translitSearchWord = transliterate(searchWord);
            for (const nameWord of wordsInName) {
                const translitNameWord = transliterate(nameWord);
                if (isSimilar(translitSearchWord, translitNameWord, 0.6)) {
                    return true;
                }
            }
        }
        
        return false;
    });

    return results.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        const aExact = aName.includes(searchLower);
        const bExact = bName.includes(searchLower);
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        const aTranslit = transliterate(aName).includes(transliterated);
        const bTranslit = transliterate(bName).includes(transliterated);
        
        if (aTranslit && !bTranslit) return -1;
        if (!aTranslit && bTranslit) return 1;
        
        return 0;
    });
}

function showSearchSuggestions(suggestions) {
    if (!searchSuggestions || !searchInput) return;
    
    searchSuggestions.innerHTML = '';
    
    if (suggestions.length === 0) {
        const noResultsItem = document.createElement('div');
        noResultsItem.className = 'suggestion-item';
        noResultsItem.innerHTML = `
            <div class="suggestion-name">Ничего не найдено</div>
            <div class="suggestion-category">Попробуйте другие ключевые слова</div>
        `;
        searchSuggestions.appendChild(noResultsItem);
    } else {
        suggestions.forEach(plugin => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.innerHTML = `
                <div class="suggestion-name">${plugin.name}</div>
                <div class="suggestion-category">${typeNames[plugin.type]} • ${categoryNames[plugin.category]}</div>
            `;
            
            suggestionItem.addEventListener('click', function() {
                searchInput.value = plugin.name;
                hideSearchSuggestions();
                filterPlugins();
            });
            
            searchSuggestions.appendChild(suggestionItem);
        });
    }
    
    searchInput.classList.add('with-suggestions');
    searchSuggestions.classList.add('show');
}

function setupSearchSuggestions() {
    if (!searchInput || !searchSuggestions) return;
    
    searchInput.addEventListener('input', function() {
        const value = this.value.trim();
        
        if (value.length > 1) {
            const suggestions = smartSearch(value, plugins).slice(0, 5);
            showSearchSuggestions(suggestions);
        } else {
            hideSearchSuggestions();
        }
    });
    
    searchInput.addEventListener('focus', function() {
        const value = this.value.trim();
        if (value.length > 1) {
            const suggestions = smartSearch(value, plugins).slice(0, 5);
            showSearchSuggestions(suggestions);
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
            hideSearchSuggestions();
        }
    });
}

function filterPlugins() {
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    
    let filteredPlugins;
    if (searchTerm.length > 1) {
        filteredPlugins = smartSearch(searchTerm, plugins);
    } else {
        filteredPlugins = plugins;
    }

    filteredPlugins = filteredPlugins.filter(plugin => {
        const matchesType = activeFilters.type.includes('all') || 
                           activeFilters.type.includes(plugin.type);
        
        const matchesCategory = activeFilters.category.includes('all') || 
                               activeFilters.category.includes(plugin.category);
        
        return matchesType && matchesCategory;
    });
    
    if (searchTerm === '') {
        hideSearchSuggestions();
    }
    
    displayPlugins(filteredPlugins);
}

function initFilters() {
    const filterButtons = document.querySelectorAll('.tab-btn');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const filterType = this.dataset.filter;
            const value = this.value;
            
            if (value === 'all') {
                document.querySelectorAll(`.tab-btn[data-filter="${filterType}"]`).forEach(otherBtn => {
                    otherBtn.classList.remove('active');
                });
                this.classList.add('active');
                activeFilters[filterType] = ['all'];
            } else {
                const allBtn = document.querySelector(`.tab-btn[data-filter="${filterType}"][value="all"]`);
                if (allBtn) allBtn.classList.remove('active');
                
                this.classList.toggle('active');
                
                const activeButtons = document.querySelectorAll(`.tab-btn[data-filter="${filterType}"].active`);
                activeFilters[filterType] = Array.from(activeButtons).map(btn => btn.value);
                
                if (activeFilters[filterType].length === 0) {
                    if (allBtn) allBtn.classList.add('active');
                    activeFilters[filterType] = ['all'];
                }
            }
            
            filterPlugins();
        });
    });
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterPlugins();
        });
    }
}

function resetFilters() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn[value="all"]').forEach(btn => {
        btn.classList.add('active');
    });
    
    if (searchInput) searchInput.value = '';
    
    activeFilters = {
        type: ['all'],
        category: ['all']
    };
    
    filterPlugins();
    hideSearchSuggestions();
}

function smoothScrollToSearch(event) {
    if (event) event.preventDefault();

    window.scroll(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    setTimeout(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }, 10);
}

function refreshPage() {
    window.location.reload();
}

function initCustomScrollbars() {
    const isWebkit = 'WebkitAppearance' in document.documentElement.style;
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    
    if (isWebkit) {
        document.documentElement.classList.add('webkit-scrollbar');
    }
    if (isFirefox) {
        document.documentElement.classList.add('firefox-scrollbar');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadPlugins();
});

window.handleDownloadClick = handleDownloadClick;
window.resetFilters = resetFilters;
window.refreshPage = refreshPage;
window.smoothScrollToSearch = smoothScrollToSearch;