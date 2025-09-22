
        // Sidebar toggle functionality
        document.addEventListener('DOMContentLoaded', function() {
            const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.getElementById('toggleBtn');

            toggleBtn.addEventListener('click', function() {
                sidebar.classList.toggle('collapsed');
                toggleBtn.innerHTML = sidebar.classList.contains('collapsed') ? '→' : '←';
            });

            // Auto-collapse on mobile
            function checkMobile() {
                if (window.innerWidth <= 700) {
                    sidebar.classList.add('collapsed');
                    toggleBtn.innerHTML = '→';
                } else {
                    sidebar.classList.remove('collapsed');
                    toggleBtn.innerHTML = '←';
                }
            }

            window.addEventListener('resize', checkMobile);
            checkMobile();
        });

        // Navigation functionality
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', function(e) {
                if (this.getAttribute('href')) {
                    document.querySelectorAll('.sidebar-nav a').forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        });

        // Navigation functions - UPDATED ROUTES
        function openBoard(boardId) {
            // Navigate to whiteboard with specific board ID
            window.location.href = `/mainscreen?board=${boardId}`;
        }

        function useTemplate(templateId) {
            // Navigate to whiteboard with template
            window.location.href = `/mainscreen?template=${templateId}`;
        }

        function showImportDialog() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf,.png,.jpg,.jpeg,.svg,.psd,.sketch';
            input.onchange = function(e) {
                const file = e.target.files[0];
                if (file) {
                    // Navigate to whiteboard with import parameter
                    window.location.href = `/mainscreen?import=${encodeURIComponent(file.name)}`;
                }
            };
            input.click();
        }

        function showJoinDialog() {
            const sessionCode = prompt('Enter collaboration session code:');
            if (sessionCode && sessionCode.trim()) {
                // Navigate to whiteboard with session parameter
                window.location.href = `/mainscreen?session=${encodeURIComponent(sessionCode.trim())}`;
            }
        }

        // Search functionality
        document.querySelector('.search-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim();
                if (query) {
                    // Navigate to search results
                    window.location.href = `/my-content?search=${encodeURIComponent(query)}`;
                }
            }
        });
    