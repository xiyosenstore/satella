
// Global variables
let proxyList = [];
let filteredProxyList = [];
let selectedProxy = null;
const defaultProxyUrl = 'https://raw.githubusercontent.com/InconigtoMode/proxylist/refs/heads/main/all.txt';
// Change from:
// const serverDomain = 'inconigto-mode.web.id';

// To:
const serverDomains = ['inconigto-mode.web.id', 'inconigto-mode.biz.id'];
let selectedServerDomain = serverDomains[0]; // Default to first domain
const defaultUUID = '00000000-0000-0000-0000-000000000000';
const itemsPerPage = 10;
let currentPage = 1;

// DOM elements
const proxyListSection = document.getElementById('proxy-list-section');
const accountCreationSection = document.getElementById('account-creation-section');
const resultSection = document.getElementById('result-section');
const loadingIndicator = document.getElementById('loading-indicator');
const proxyListContainer = document.getElementById('proxy-list-container');
const noProxiesMessage = document.getElementById('no-proxies-message');
const customUrlInput = document.getElementById('custom-url-input');
const proxyUrlInput = document.getElementById('proxy-url');
const paginationContainer = document.getElementById('pagination-container');
const proxyCountInfo = document.getElementById('proxy-count-info');
const searchInput = document.getElementById('search-input');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Display fallback proxy list immediately to ensure something is visible
    displayFallbackProxyList();
    
    // Then try to load the actual proxy list
    loadProxyList(defaultProxyUrl);
    
    // Event listeners
    document.getElementById('refresh-btn').addEventListener('click', function() {
        loadProxyList(defaultProxyUrl);
    });
    
    document.getElementById('custom-url-btn').addEventListener('click', function() {
        customUrlInput.classList.toggle('hidden');
    });
    
    document.getElementById('load-custom-url').addEventListener('click', function() {
        const url = proxyUrlInput.value.trim();
        if (url) {
            loadProxyList(url);
        }
    });
    
    document.getElementById('back-to-list').addEventListener('click', function() {
        showProxyListSection();
    });
    
    document.getElementById('back-to-form').addEventListener('click', function() {
        resultSection.classList.add('hidden');
        accountCreationSection.classList.remove('hidden');
    });
    
    document.getElementById('create-new').addEventListener('click', function() {
        resultSection.classList.add('hidden');
        accountCreationSection.classList.remove('hidden');
    });
    
    document.getElementById('back-to-list-from-result').addEventListener('click', function() {
        showProxyListSection();
    });
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            filteredProxyList = [...proxyList];
        } else {
            filteredProxyList = proxyList.filter(proxy => 
                proxy.provider.toLowerCase().includes(searchTerm) || 
                proxy.country.toLowerCase().includes(searchTerm)
            );
        }
        
        currentPage = 1;
        renderProxyList();
    });
    
    // Protocol tabs
    const protocolTabs = document.querySelectorAll('.tab-btn');
    const protocolForms = document.querySelectorAll('.protocol-form');
    
    protocolTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            protocolTabs.forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all forms
            protocolForms.forEach(form => {
                form.classList.add('hidden');
            });
            
            // Show the selected form
            const targetId = tab.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('hidden');
        });
    });
    
    // Populate server domain dropdowns
    const serverDomainSelects = [
        document.getElementById('vmess-server-domain'),
        document.getElementById('vless-server-domain'),
        document.getElementById('trojan-server-domain'),
        document.getElementById('ss-server-domain')
    ];

    serverDomainSelects.forEach(select => {
        if (select) {
            // Clear existing options
            select.innerHTML = '';
            
            // Add options for each domain
            serverDomains.forEach(domain => {
                const option = document.createElement('option');
                option.value = domain;
                option.textContent = domain;
                select.appendChild(option);
            });
            
            // Add event listener to update selected domain
            select.addEventListener('change', function() {
                selectedServerDomain = this.value;
            });
        }
    });
    
    // Form submissions
    const forms = [
        document.getElementById('vmess-account-form'),
        document.getElementById('vless-account-form'),
        document.getElementById('trojan-account-form'),
        document.getElementById('ss-account-form')
    ];
    
    // Custom Bug dan Wildcard functionality
    const bugInputs = [
        document.getElementById('vmess-bug'),
        document.getElementById('vless-bug'),
        document.getElementById('trojan-bug'),
        document.getElementById('ss-bug')
    ];

    const wildcardContainers = [
        document.getElementById('vmess-wildcard-container'),
        document.getElementById('vless-wildcard-container'),
        document.getElementById('trojan-wildcard-container'),
        document.getElementById('ss-wildcard-container')
    ];

    const wildcardCheckboxes = [
        document.getElementById('vmess-wildcard'),
        document.getElementById('vless-wildcard'),
        document.getElementById('trojan-wildcard'),
        document.getElementById('ss-wildcard')
    ];

    // Add event listeners to bug inputs
    bugInputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            if (this.value.trim() !== '') {
                wildcardContainers[index].classList.add('show');
            } else {
                wildcardContainers[index].classList.remove('show');
                wildcardCheckboxes[index].checked = false;
            }
        });
    });

    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(form);
            const formType = form.id.split('-')[0]; // vmess, vless, trojan, or ss
            
            // Get custom bug and wildcard values
            const customBug = formData.get('bug') ? formData.get('bug').toString().trim() : '';
            const useWildcard = formData.get('wildcard') === 'on';
            
            // Determine server, host, and SNI based on custom bug and wildcard
            // Get the selected server domain from the form
            const selectedDomain = formData.get('server-domain') || selectedServerDomain;
            let server = selectedDomain;
            let host = selectedDomain;
            let sni = selectedDomain;
            
            if (customBug) {
                server = customBug;
                if (useWildcard) {
                    host = `${customBug}.${selectedDomain}`;
                    sni = `${customBug}.${selectedDomain}`;
                }
            }
            
            // Generate connection URL based on protocol
            let connectionUrl = '';
            
            if (formType === 'vmess') {
                const security = formData.get('security');
                // Set port based on TLS setting
                const port = security === 'tls' ? 443 : 80;
                
                const vmessConfig = {
                    v: '2',
                    ps: formData.get('name'),
                    add: server,
                    port: port,
                    id: formData.get('uuid'),
                    aid: '0',
                    net: 'ws', // Always WebSocket
                    type: 'none',
                    host: host,
                    path: formData.get('path'),
                    tls: security === 'tls' ? 'tls' : '',
                    sni: sni,
                    scy: 'zero'
                };
                
                connectionUrl = 'vmess://' + btoa(JSON.stringify(vmessConfig));
            } else if (formType === 'vless') {
                const uuid = formData.get('uuid');
                const path = encodeURIComponent(formData.get('path'));
                const security = formData.get('security');
                const encryption = 'none';
                const name = encodeURIComponent(formData.get('name'));
                // Set port based on TLS setting
                const port = security === 'tls' ? 443 : 80;
                
                connectionUrl = `vless://${uuid}@${server}:${port}?encryption=${encryption}&security=${security}&type=ws&host=${host}&path=${path}&sni=${sni}#${name}`;
            } else if (formType === 'trojan') {
                const password = formData.get('password');
                const path = encodeURIComponent(formData.get('path'));
                const security = formData.get('security');
                const name = encodeURIComponent(formData.get('name'));
                // Set port based on TLS setting
                const port = security === 'tls' ? 443 : 80;
                
                connectionUrl = `trojan://${password}@${server}:${port}?security=${security}&type=ws&host=${host}&path=${path}&sni=${sni}#${name}`;
            } else if (formType === 'ss') {
                const password = formData.get('password');
                const name = encodeURIComponent(formData.get('name'));
                const path = encodeURIComponent(formData.get('path'));
                const security = formData.get('security');
                
                // Set port based on TLS setting
                const port = security === 'tls' ? 443 : 80;
                
                // Use fixed cipher: none for Shadowsocks
                const method = "none";
                
                // Base64 encode the method:password part
                const userInfo = btoa(`${method}:${password}`);
                
                // Create the new format SS URL with dynamic port
                connectionUrl = `ss://${userInfo}@${server}:${port}?encryption=none&type=ws&host=${host}&path=${path}&security=${security}&sni=${sni}#${name}`;
            }
            
            // Display the result
            document.getElementById('connection-url').textContent = connectionUrl;
            
            // Generate QR code - Improved with multiple fallback methods
            generateQRCode(connectionUrl);
            
            // Show result section
            accountCreationSection.classList.add('hidden');
            resultSection.classList.remove('hidden');
        });
    });
    
    // Copy URL button
    document.getElementById('copy-url').addEventListener('click', function() {
        const connectionUrl = document.getElementById('connection-url').textContent;
        navigator.clipboard.writeText(connectionUrl).then(() => {
            this.innerHTML = '<i class="fas fa-check mr-1"></i> Copied!';
            setTimeout(() => {
                this.innerHTML = '<i class="far fa-copy mr-1"></i> Copy';
            }, 2000);
        });
    });
    
    // Download QR code button
    document.getElementById('download-qr').addEventListener('click', function() {
        downloadQRCode();
    });
});

// Improved QR code generation with multiple fallback methods
function generateQRCode(text) {
    const qrcodeElement = document.getElementById('qrcode');
    qrcodeElement.innerHTML = '';
    
    // Try multiple methods to generate QR code
    try {
        // Method 1: Try to generate QR code using toCanvas
        QRCode.toCanvas(qrcodeElement, text, { 
            width: 200,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, function(error) {
            if (error) {
                console.error("QR Code canvas error:", error);
                // If canvas fails, try method 2
                generateQRCodeFallback(text, qrcodeElement);
            }
        });
    } catch (error) {
        console.error("QR Code generation error:", error);
        // If method 1 fails completely, try method 2
        generateQRCodeFallback(text, qrcodeElement);
    }
}

// Fallback QR code generation method
function generateQRCodeFallback(text, container) {
    try {
        // Method 2: Try to generate QR code as SVG
        QRCode.toString(text, {
            type: 'svg',
            width: 200,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, function(error, svg) {
            if (error || !svg) {
                console.error("QR Code SVG error:", error);
                // If SVG fails, try method 3
                generateQRCodeLastResort(text, container);
            } else {
                container.innerHTML = svg;
            }
        });
    } catch (error) {
        console.error("QR Code SVG generation error:", error);
        // If method 2 fails completely, try method 3
        generateQRCodeLastResort(text, container);
    }
}

// Last resort QR code generation method
function generateQRCodeLastResort(text, container) {
    try {
        // Method 3: Try to generate QR code as data URL
        const encodedText = encodeURIComponent(text);
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedText}`;
        
        const img = document.createElement('img');
        img.src = qrApiUrl;
        img.alt = "QR Code";
        img.width = 200;
        img.height = 200;
        img.onerror = function() {
            container.innerHTML = '<div class="text-center text-rose-500">Failed to generate QR code</div>';
        };
        
        container.innerHTML = '';
        container.appendChild(img);
    } catch (error) {
        console.error("QR Code last resort error:", error);
        container.innerHTML = '<div class="text-center text-rose-500">Failed to generate QR code</div>';
    }
}

// Download QR code function
function downloadQRCode() {
    const qrcodeElement = document.getElementById('qrcode');
    
    // Try to find canvas or img in the QR code container
    const canvas = qrcodeElement.querySelector('canvas');
    const img = qrcodeElement.querySelector('img');
    const svg = qrcodeElement.querySelector('svg');
    
    let imageUrl = null;
    
    if (canvas) {
        // If canvas exists, convert it to data URL
        try {
            imageUrl = canvas.toDataURL('image/png');
        } catch (e) {
            console.error("Canvas to data URL error:", e);
        }
    } else if (img) {
        // If img exists, use its src
        imageUrl = img.src;
    } else if (svg) {
        // If SVG exists, convert it to data URL
        try {
            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
            imageUrl = URL.createObjectURL(svgBlob);
        } catch (e) {
            console.error("SVG to data URL error:", e);
        }
    }
    
    if (imageUrl) {
        // Create a link and trigger download
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'qrcode.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Revoke object URL if it was created from a blob
        if (imageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(imageUrl);
        }
    } else {
        alert('Failed to download QR code. Please try again.');
    }
}

// Function to display fallback proxy list
function displayFallbackProxyList() {
    // Add a fallback proxy list for immediate display
    proxyList = [
        { ip: '103.6.207.108', port: '8080', country: 'ID', provider: 'PT Pusat Media Indonesia' },
        { ip: '45.8.107.73', port: '80', country: 'US', provider: 'Cloudflare Inc' },
        { ip: '172.67.181.52', port: '443', country: 'US', provider: 'Cloudflare Inc' },
        { ip: '104.21.69.85', port: '443', country: 'US', provider: 'Cloudflare Inc' },
        { ip: '185.219.132.181', port: '8080', country: 'NL', provider: 'Netherlands Provider' },
        { ip: '45.8.107.73', port: '80', country: 'UK', provider: 'British Telecom' },
        { ip: '172.67.182.77', port: '443', country: 'JP', provider: 'Japan Telecom' },
        { ip: '104.21.70.123', port: '8080', country: 'SG', provider: 'Singapore Telecom' },
        { ip: '185.219.133.45', port: '3128', country: 'DE', provider: 'Deutsche Telekom' },
        { ip: '45.8.105.26', port: '80', country: 'FR', provider: 'Orange France' },
        { ip: '172.67.183.98', port: '443', country: 'CA', provider: 'Bell Canada' },
        { ip: '104.21.71.205', port: '8080', country: 'AU', provider: 'Telstra Australia' },
        { ip: '185.219.134.67', port: '3128', country: 'IT', provider: 'Telecom Italia' },
        { ip: '45.8.104.83', port: '80', country: 'BR', provider: 'Brazil Telecom' },
        { ip: '172.67.184.12', port: '443', country: 'RU', provider: 'Russian Telecom' }
    ];
    
    filteredProxyList = [...proxyList];
    renderProxyList();
}

// Process proxy list data
function processProxyData(text) {
    // Handle different line endings and remove empty lines
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    console.log(`Found ${lines.length} lines in proxy data`);
    
    if (lines.length === 0) {
        noProxiesMessage.classList.remove('hidden');
        return; // No data to process
    }
    
    // Try to determine the format of the data
    let delimiter = ','; // Default delimiter
    
    // Check if the data uses tabs or other delimiters
    const firstLine = lines[0];
    if (firstLine.includes('\t')) {
        delimiter = '\t';
    } else if (firstLine.includes('|')) {
        delimiter = '|';
    } else if (firstLine.includes(';')) {
        delimiter = ';';
    }
    
    // Parse proxy list with the detected delimiter
    proxyList = lines.map(line => {
        const parts = line.split(delimiter);
        
        // Require at least IP and port
        if (parts.length >= 2) {
            return {
                ip: parts[0].trim(),
                port: parts[1].trim(),
                country: parts.length >= 3 ? parts[2].trim() : 'Unknown',
                provider: parts.length >= 4 ? parts[3].trim() : 'Unknown Provider'
            };
        }
        return null;
    }).filter(proxy => proxy && proxy.ip && proxy.port);
    
    console.log(`Processed ${proxyList.length} valid proxies`);
    
    // If no valid proxies were found, show message and use fallback
    if (proxyList.length === 0) {
        noProxiesMessage.classList.remove('hidden');
        displayFallbackProxyList();
        return;
    }
    
    // Reset pagination
    currentPage = 1;
    filteredProxyList = [...proxyList];
    
    // Render the proxy list
    renderProxyList();
}

// Function to render the proxy list with pagination
function renderProxyList() {
    proxyListContainer.innerHTML = '';
    
    if (filteredProxyList.length === 0) {
        noProxiesMessage.classList.remove('hidden');
        paginationContainer.innerHTML = '';
        proxyCountInfo.textContent = '';
        return;
    }
    
    noProxiesMessage.classList.add('hidden');
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredProxyList.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredProxyList.length);
    
    // Get current page items
    const currentItems = filteredProxyList.slice(startIndex, endIndex);
    
    // Render proxy cards
    currentItems.forEach((proxy, index) => {
        const actualIndex = startIndex + index;
        const card = document.createElement('div');
        card.className = 'proxy-card group';
        
        // Create the main content of the card with forced row layout
        const cardContent = document.createElement('div');
        cardContent.className = 'flex justify-between items-center';
        cardContent.style.display = 'flex'; // Force flex display
        cardContent.style.flexDirection = 'row'; // Force row direction

        // Left side with proxy info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex-1 min-w-0 pr-2'; // min-w-0 helps with text truncation

        // Replace the provider container creation code in the renderProxyList function with this:

        // Provider and status badge container
        const providerContainer = document.createElement('div');
        providerContainer.className = 'flex-items-center';
        providerContainer.style.display = 'flex';
        providerContainer.style.alignItems = 'center';
        providerContainer.style.width = '100%';
        providerContainer.style.position = 'relative';

        // Provider name with truncation
        const providerName = document.createElement('div');
        providerName.className = 'font-medium text-sm truncate group-hover:text-indigo-300 transition-colors';
        providerName.style.maxWidth = 'calc(100% - 20px)'; // Leave space for the status indicator
        providerName.textContent = proxy.provider;
        providerContainer.appendChild(providerName);

        // Status badge (initially loading)
        const statusBadge = document.createElement('span');
        statusBadge.className = 'inline-block w-3 h-3 rounded-full bg-gray-500 ml-2 pulse-animation';
        statusBadge.style.flexShrink = '0';
        statusBadge.style.position = 'relative';
        statusBadge.innerHTML = '';
        statusBadge.title = 'Memeriksa...';
        statusBadge.id = `proxy-status-${actualIndex}`;
        providerContainer.appendChild(statusBadge);

        infoDiv.appendChild(providerContainer);

        // Country and IP:Port info with truncation
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'text-xs text-gray-400 mt-1 truncate group-hover:text-gray-300 transition-colors';
        detailsDiv.style.whiteSpace = 'nowrap';
        detailsDiv.style.overflow = 'hidden';
        detailsDiv.style.textOverflow = 'ellipsis';
        detailsDiv.textContent = `${proxy.country} | ${proxy.ip}:${proxy.port}`;
        infoDiv.appendChild(detailsDiv);

        // Right side with button - fixed width to prevent wrapping
        const buttonDiv = document.createElement('div');
        buttonDiv.className = 'flex-shrink-0';
        buttonDiv.style.flexShrink = '0'; // Prevent shrinking

        const button = document.createElement('button');
        button.className = 'create-account-btn primary-btn py-2 px-4 rounded-lg text-xs group-hover:scale-105 transition-transform';
        button.style.whiteSpace = 'nowrap';
        button.style.minWidth = '60px';
        button.setAttribute('data-index', actualIndex);
        button.innerHTML = 'Create';
        buttonDiv.appendChild(button);
        
        // Assemble the card
        cardContent.appendChild(infoDiv);
        cardContent.appendChild(buttonDiv);
        card.appendChild(cardContent);
        
        proxyListContainer.appendChild(card);
        
        // Check proxy status for this card
        checkProxyStatusInList(proxy, statusBadge);
    });
    
    // Add event listeners to create account buttons
    document.querySelectorAll('.create-account-btn').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            selectProxy(index);
            showAccountCreationSection();
        });
    });
    
    // Render pagination controls
    renderPagination(totalPages);
    
    // Update proxy count info
    proxyCountInfo.textContent = `Showing ${startIndex + 1}-${endIndex} of ${filteredProxyList.length} proxies`;
}

// Function to check proxy status in the list
function checkProxyStatusInList(proxy, statusBadge) {
    const statusURL = `https://apicek.t-me-inconigto.workers.dev/proxy?ip=${proxy.ip}&port=${proxy.port}`;
    
    fetch(statusURL)
        .then(response => response.json())
        .then(data => {
            if (data.proxyip === true) {
                statusBadge.className = 'inline-block w-3 h-3 rounded-full bg-emerald-500 ml-2';
                statusBadge.innerHTML = '';
                statusBadge.title = 'Aktif';
            } else {
                statusBadge.className = 'inline-block w-3 h-3 rounded-full bg-rose-500 ml-2';
                statusBadge.innerHTML = '';
                statusBadge.title = 'Mati';
            }
        })
        .catch(error => {
            statusBadge.className = 'inline-block w-3 h-3 rounded-full bg-amber-500 ml-2';
            statusBadge.innerHTML = '';
            statusBadge.title = 'Tidak diketahui';
            console.error("Fetch error:", error);
        });
}

// Function to render pagination controls
function renderPagination(totalPages) {
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderProxyList();
        }
    });
    paginationContainer.appendChild(prevBtn);
    
    // Page numbers
    const maxVisiblePages = window.innerWidth < 640 ? 3 : 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page button if not visible
    if (startPage > 1) {
        const firstPageBtn = document.createElement('button');
        firstPageBtn.className = 'pagination-btn';
        firstPageBtn.textContent = '1';
        firstPageBtn.addEventListener('click', () => {
            currentPage = 1;
            renderProxyList();
        });
        paginationContainer.appendChild(firstPageBtn);
        
        // Ellipsis if needed
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'px-1 text-gray-400';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
    }
    
    // Page buttons
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i.toString();
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderProxyList();
        });
        paginationContainer.appendChild(pageBtn);
    }
    
    // Last page button if not visible
    if (endPage < totalPages) {
        // Ellipsis if needed
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'px-1 text-gray-400';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
        
        const lastPageBtn = document.createElement('button');
        lastPageBtn.className = 'pagination-btn';
        lastPageBtn.textContent = totalPages.toString();
        lastPageBtn.addEventListener('click', () => {
            currentPage = totalPages;
            renderProxyList();
        });
        paginationContainer.appendChild(lastPageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderProxyList();
        }
    });
    paginationContainer.appendChild(nextBtn);
}

// Function to select a proxy
async function selectProxy(index) {
    selectedProxy = filteredProxyList[index];
    
    // Update selected proxy info
    document.getElementById('selected-ip').textContent = selectedProxy.ip;
    document.getElementById('selected-port').textContent = selectedProxy.port;
    document.getElementById('selected-country').textContent = selectedProxy.country;
    document.getElementById('selected-provider').textContent = selectedProxy.provider;
    
    // Update form fields
    const accountName = `${selectedProxy.country} - ${selectedProxy.provider}`;
    const path = `/Inconigto-Mode/${selectedProxy.ip}-${selectedProxy.port}`;
    
    document.getElementById('vmess-name').value = accountName;
    document.getElementById('vless-name').value = accountName;
    document.getElementById('trojan-name').value = accountName;
    document.getElementById('ss-name').value = accountName;
    
    document.getElementById('vmess-path').value = path;
    document.getElementById('vless-path').value = path;
    document.getElementById('trojan-path').value = path;
    document.getElementById('ss-path').value = path;
    
    // Set default UUID
    document.getElementById('vmess-uuid').value = defaultUUID;
    document.getElementById('vless-uuid').value = defaultUUID;
    
    // Set default password (same as UUID)
    document.getElementById('trojan-password').value = defaultUUID;
    document.getElementById('ss-password').value = defaultUUID;
    
    // Check proxy status in the account creation section
    const statusContainer = document.getElementById('proxy-status-container');
    const statusLoading = document.getElementById('proxy-status-loading');
    const statusActive = document.getElementById('proxy-status-active');
    const statusDead = document.getElementById('proxy-status-dead');
    const statusUnknown = document.getElementById('proxy-status-unknown');
    const latencyElement = document.getElementById('proxy-latency');
    
    // Show status container and loading state
    statusContainer.classList.remove('hidden');
    statusLoading.classList.remove('hidden');
    statusActive.classList.add('hidden');
    statusDead.classList.add('hidden');
    statusUnknown.classList.add('hidden');
    
    checkProxyStatus(selectedProxy);
}

// Function to check proxy status in the account creation section
function checkProxyStatus(proxy) {
    const startTime = performance.now();
    const statusURL = `https://apicek.t-me-inconigto.workers.dev/proxy?ip=${proxy.ip}&port=${proxy.port}`;
    const statusContainer = document.getElementById('proxy-status-container');
    const statusLoading = document.getElementById('proxy-status-loading');
    const statusActive = document.getElementById('proxy-status-active');
    const statusDead = document.getElementById('proxy-status-dead');
    const statusUnknown = document.getElementById('proxy-status-unknown');
    const latencyElement = document.getElementById('proxy-latency');
    
    // Show status container and loading state
    statusContainer.classList.remove('hidden');
    statusLoading.classList.remove('hidden');
    statusActive.classList.add('hidden');
    statusDead.classList.add('hidden');
    statusUnknown.classList.add('hidden');
    
    fetch(statusURL)
        .then(response => response.json())
        .then(data => {
            const endTime = performance.now();
            let latency = Math.floor((endTime - startTime));
            
            // Hide loading state
            statusLoading.classList.add('hidden');
            
            if (data.proxyip === true) {
                statusActive.classList.remove('hidden');
                latencyElement.textContent = `${latency}ms`;
            } else {
                statusDead.classList.remove('hidden');
            }
        })
        .catch(error => {
            // Hide loading state
            statusLoading.classList.add('hidden');
            statusUnknown.classList.remove('hidden');
            console.error("Fetch error:", error);
        });
}

// Function to show proxy list section
function showProxyListSection() {
    proxyListSection.classList.remove('hidden');
    accountCreationSection.classList.add('hidden');
    resultSection.classList.add('hidden');
}

// Function to show account creation section
function showAccountCreationSection() {
    proxyListSection.classList.add('hidden');
    accountCreationSection.classList.remove('hidden');
    resultSection.classList.add('hidden');
}

// Helper functions
function generateUUID(elementId) {
    document.getElementById(elementId).value = defaultUUID;
}

function generatePassword(elementId) {
    // Set password to the default UUID instead of generating a random one
    document.getElementById(elementId).value = defaultUUID;
}

// Update the loadProxyList function to better handle GitHub data and CORS issues
function loadProxyList(url) {
    // Show loading indicator
    loadingIndicator.classList.remove('hidden');
    proxyListContainer.innerHTML = '';
    noProxiesMessage.classList.add('hidden');
    
    // Try multiple CORS proxies in sequence
    const corsProxies = [
        // Direct fetch (no proxy)
        async () => {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Direct fetch failed');
            return await response.text();
        },
        // CORS Anywhere proxy
        async () => {
            const corsUrl = `https://cors-anywhere.herokuapp.com/${url}`;
            const response = await fetch(corsUrl);
            if (!response.ok) throw new Error('CORS Anywhere proxy failed');
            return await response.text();
        },
        // AllOrigins proxy
        async () => {
            const corsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(corsUrl);
            if (!response.ok) throw new Error('AllOrigins proxy failed');
            const data = await response.json();
            return data.contents;
        },
        // CORS.sh proxy
        async () => {
            const corsUrl = `https://cors.sh/${url}`;
            const response = await fetch(corsUrl, {
                headers: {
                    'x-cors-api-key': 'temp_' + Math.random().toString(36).substring(2,12),
                }
            });
            if (!response.ok) throw new Error('CORS.sh proxy failed');
            return await response.text();
        }
    ];
    
    // Try each proxy in sequence
    (async function tryProxies(index = 0) {
        if (index >= corsProxies.length) {
            console.error('All proxies failed');
            loadingIndicator.classList.add('hidden');
            noProxiesMessage.classList.remove('hidden');
            // Fall back to sample data
            displayFallbackProxyList();
            return;
        }
        
        try {
            const text = await corsProxies[index]();
            console.log("Fetched data:", text.substring(0, 200) + "..."); // Debug log (truncated)
            processProxyData(text);
            loadingIndicator.classList.add('hidden');
        } catch (error) {
            console.error(`Proxy ${index} failed:`, error);
            // Try next proxy
            tryProxies(index + 1);
        }
    })();
}

// Donation modal functionality
document.addEventListener('DOMContentLoaded', function() {
    const donationButton = document.getElementById('donation-button');
    const donationModal = document.getElementById('donation-modal');
    const donationContent = document.getElementById('donation-content');
    const donationBackdrop = document.getElementById('donation-backdrop');
    const closeButton = document.getElementById('close-donation');
    
    function openDonationModal() {
        // Show the modal
        donationModal.classList.remove('opacity-0', 'pointer-events-none');
        donationModal.classList.add('opacity-100');
        
        // Animate the content
        setTimeout(() => {
            donationContent.classList.remove('scale-95');
            donationContent.classList.add('scale-100');
        }, 10);
    }
    
    function closeDonationModal() {
        // Animate the content
        donationContent.classList.remove('scale-100');
        donationContent.classList.add('scale-95');
        
        // Hide the modal
        setTimeout(() => {
            donationModal.classList.remove('opacity-100');
            donationModal.classList.add('opacity-0', 'pointer-events-none');
        }, 200);
    }
    
    // Event listeners
    donationButton.addEventListener('click', openDonationModal);
    closeButton.addEventListener('click', closeDonationModal);
    donationBackdrop.addEventListener('click', closeDonationModal);
});
