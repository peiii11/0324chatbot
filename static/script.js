// TaiSoc - 主要 JavaScript 文件

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM載入完成，初始化頁面...");
    
    // 頁面元素
    const loginPage = document.getElementById('login-page');
    const userInfoPage = document.getElementById('user-info-page');
    const successPage = document.getElementById('success-page');
    const statusMessage = document.getElementById('status-message');
    
    // 表單元素
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const nameInput = document.getElementById('name');
    const birthdayInput = document.getElementById('birthday');
    const phoneInput = document.getElementById('phone');
    
    // 按鈕元素
    const emailSignupBtn = document.getElementById('email-signup-btn');
    const emailLoginBtn = document.getElementById('email-login-btn');
    const confirmBtn = document.getElementById('confirm-btn');
    const continueBtn = document.getElementById('continue-btn');
    const switchToLoginBtn = document.getElementById('switch-to-login');
    const switchToRegisterBtn = document.getElementById('switch-to-register');
    
    // 檢查頁面元素是否存在
    console.log("檢查頁面元素:");
    console.log("- loginPage:", loginPage ? "找到" : "未找到");
    console.log("- userInfoPage:", userInfoPage ? "找到" : "未找到");
    console.log("- successPage:", successPage ? "找到" : "未找到");
    console.log("- emailSignupBtn:", emailSignupBtn ? "找到" : "未找到");
    
    // 在頁面加載時清除表單欄位中的預設值
    document.querySelectorAll('input').forEach(input => {
        input.value = '';
    });

    // 特別處理日期欄位，確保它顯示為文本輸入框而不是日期選擇器
    if (birthdayInput) {
        birthdayInput.type = 'text';
        birthdayInput.value = '';
    }
    
    console.log("[DEBUG] 已清除所有表單欄位的預設值");
    
    /* ------------------------------
       1. 註冊登入功能
    ------------------------------ */
    
    // 顯示狀態訊息
    function showStatus(message, isError = false) {
        console.log(`顯示狀態訊息: ${message}, 是否錯誤: ${isError}`);
        if (!statusMessage) {
            console.error("狀態訊息元素未找到");
            return;
        }
        
        statusMessage.textContent = message;
        statusMessage.className = isError 
            ? 'status-message error' 
            : 'status-message success';
        
        // 5秒後自動隱藏
        setTimeout(() => {
            statusMessage.className = 'status-message';
        }, 5000);
    }
    
    // 調試函數 - 檢查必要的SessionStorage數據
    function debugSessionStorage() {
        console.log("=== SessionStorage 調試資訊 ===");
        console.log("userEmail:", sessionStorage.getItem('userEmail'));
        console.log("login_method:", sessionStorage.getItem('login_method'));
        console.log("userPassword:", sessionStorage.getItem('userPassword') ? "已設置" : "未設置");
    }
    
    // 顯示頁面
    function showPage(pageToShow) {
        if (!pageToShow) {
            console.error("嘗試顯示未定義的頁面");
            return;
        }
        
        console.log("嘗試顯示頁面:", pageToShow.id);
        
        // 隱藏所有頁面
        if (loginPage) loginPage.classList.add('hidden');
        if (userInfoPage) userInfoPage.classList.add('hidden');
        if (successPage) successPage.classList.add('hidden');
        
        // 顯示指定頁面
        pageToShow.classList.remove('hidden');
        console.log(`顯示頁面: ${pageToShow.id}`);
    }
    
    // 重置並回到登入頁
    function resetToLogin() {
        // 清空欄位
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        // 清除會話存儲
        sessionStorage.removeItem('userEmail');
        sessionStorage.removeItem('userPassword');
        sessionStorage.removeItem('login_method');
        
        // 顯示登入頁
        if (loginPage) {
            showPage(loginPage);
            console.log("已重置並回到登入頁");
        }
    }
    
    // 切換登入/註冊模式
    function toggleLoginMode(isLogin) {
        const title = document.getElementById('login-title');
        const subtitle = document.getElementById('login-subtitle');
        
        if (!title || !subtitle || !emailSignupBtn) {
            console.error("找不到登入/註冊頁面元素");
            return;
        }
        
        if (isLogin) {
            title.textContent = "Log in to your account";
            subtitle.textContent = "Enter your email and password to log in";
            emailSignupBtn.textContent = "Log in with email";
            
            if (document.getElementById('login-option')) {
                document.getElementById('login-option').classList.add('hidden');
            }
            
            if (switchToRegisterBtn) switchToRegisterBtn.classList.remove('hidden');
            if (switchToLoginBtn) switchToLoginBtn.classList.add('hidden');
        } else {
            title.textContent = "Create an account";
            subtitle.textContent = "Enter your email to sign up for this app";
            emailSignupBtn.textContent = "Sign up with email";
            
            if (document.getElementById('login-option')) {
                document.getElementById('login-option').classList.add('hidden');
            }
            
            if (switchToRegisterBtn) switchToRegisterBtn.classList.add('hidden');
            if (switchToLoginBtn) switchToLoginBtn.classList.remove('hidden');
        }
        
        console.log(`已切換到${isLogin ? '登入' : '註冊'}模式`);
    }
    
    // 電子郵件和密碼格式驗證
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function isValidPhone(phone) {
        // 簡單的電話號碼格式驗證，可根據需要自定義
        return phone.length >= 8;
    }
    
    // Google 登入回調處理函數
    window.handleGoogleLogin = function(response) {
        console.log("[DEBUG] Google 登入回調觸發");
        console.log("[DEBUG] 回調數據:", response);
        
        if (statusMessage) {
            statusMessage.textContent = "Google 登入處理中...";
            statusMessage.className = "status-message success";
        }
        
        try {
            const id_token = response.credential;
            if (!id_token) {
                console.error("[ERROR] 未收到有效的 Google 令牌");
                showStatus("Google 登入失敗：未收到令牌", true);
                return;
            }

            console.log("[DEBUG] 收到 Google 令牌，長度:", id_token.length);
            
            // 發送令牌到後端
            fetch('/api/google-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: id_token })
            })
            .then(response => {
                console.log("[DEBUG] 後端響應狀態:", response.status);
                return response.json();
            })
            .then(data => {
                console.log("[DEBUG] 後端返回數據:", data);
                
                if (data.success) {
                    if (data.isNewUser) {
                        // 處理新用戶
                        console.log("[DEBUG] 是新用戶，需要填寫資料");
                        sessionStorage.setItem('userEmail', data.email);
                        sessionStorage.setItem('login_method', 'google');
                        
                        // 切換到用戶資訊頁面
                        if (userInfoPage) showPage(userInfoPage);
                        
                        // 確保表單欄位為空
                        if (nameInput) nameInput.value = '';
                        if (birthdayInput) birthdayInput.value = '';
                        if (phoneInput) phoneInput.value = '';
                        
                        // 更新狀態
                        showStatus("請填寫您的個人資料");
                        
                        console.log("[DEBUG] 已切換到個人資料頁面");
                        // 打印SessionStorage調試信息
                        debugSessionStorage();
                    } else {
                        // 處理現有用戶
                        console.log("[DEBUG] 是現有用戶，直接登入成功");
                        
                        // 切換到成功頁面
                        if (successPage) showPage(successPage);
                        
                        // 更新狀態
                        showStatus("登入成功！");
                        
                        console.log("[DEBUG] 已切換到成功頁面");
                    }
                } else {
                    console.error("[ERROR] Google 登入失敗:", data.message);
                    showStatus("Google 登入失敗: " + data.message, true);
                }
            })
            .catch(error => {
                console.error("[ERROR] 請求出錯:", error);
                showStatus("登入過程中發生錯誤，請稍後再試", true);
            });
        } catch (e) {
            console.error("[ERROR] 回調處理異常:", e);
            showStatus("處理 Google 登入時發生錯誤", true);
        }
    };
    
    // 註冊事件處理器
    
    // 註冊切換功能的事件處理器
    if (switchToLoginBtn) {
        switchToLoginBtn.addEventListener('click', function(e) {
            console.log("點擊「已有帳號」");
            e.preventDefault();
            toggleLoginMode(true);
        });
    }
    
    if (switchToRegisterBtn) {
        switchToRegisterBtn.addEventListener('click', function(e) {
            console.log("點擊「沒有帳號」");
            e.preventDefault();
            toggleLoginMode(false);
        });
    }
    
    // 電子郵件註冊按鈕點擊事件
    if (emailSignupBtn) {
        emailSignupBtn.addEventListener('click', function() {
            console.log("點擊「使用電子郵件註冊」按鈕");
            
            if (!emailInput || !passwordInput) {
                console.error("找不到電子郵件或密碼輸入框");
                return;
            }
            
            const email = emailInput.value;
            const password = passwordInput.value;
            
            console.log("電子郵件:", email);
            console.log("密碼長度:", password ? password.length : 0);
            
            if (!email || !password) {
                showStatus('請輸入有效的電子郵件地址和密碼', true);
                return;
            }
            
            // 檢查是否是登入模式
            if (this.textContent === "Log in with email") {
                console.log("執行登入流程");
                // 執行登入
                fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: email, password: password })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // 登入成功，直接進入成功頁面
                        showStatus('登入成功！');
                        if (successPage) showPage(successPage);
                    } else {
                        showStatus(data.message || '登入失敗', true);
                    }
                })
                .catch(error => {
                    console.error('登入時出錯:', error);
                    showStatus('登入過程中發生錯誤，請稍後再試', true);
                });
                return;
            }
            
            console.log("檢查電子郵件是否已註冊");
            // 檢查是否已註冊
            fetch('/api/check-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email })
            })
            .then(response => response.json())
            .then(data => {
                console.log("檢查結果:", data);
                if (data.success) {
                    if (data.exists) {
                        // 電子郵件已註冊，顯示登入選項
                        console.log("電子郵件已註冊，顯示登入選項");
                        const loginOption = document.getElementById('login-option');
                        if (loginOption) loginOption.classList.remove('hidden');
                    } else {
                        // 新用戶，繼續註冊流程
                        console.log("新用戶，繼續註冊流程");
                        sessionStorage.setItem('userEmail', email);
                        sessionStorage.setItem('userPassword', password);
                        sessionStorage.setItem('login_method', 'email');
                        
                        // 切換到用戶資訊頁面
                        if (userInfoPage) showPage(userInfoPage);
                        
                        // 確保表單欄位為空
                        if (nameInput) nameInput.value = '';
                        if (birthdayInput) birthdayInput.value = '';
                        if (phoneInput) phoneInput.value = '';
                        
                        // 打印SessionStorage調試信息
                        debugSessionStorage();
                    }
                } else {
                    showStatus(data.message || '檢查電子郵件失敗', true);
                }
            })
            .catch(error => {
                console.error('檢查電子郵件時出錯:', error);
                showStatus('檢查電子郵件時出錯，請稍後再試', true);
            });
        });
    } else {
        console.error("找不到電子郵件註冊按鈕");
    }
    
    // 電子郵件登入按鈕點擊事件
    if (emailLoginBtn) {
        emailLoginBtn.addEventListener('click', function() {
            console.log("點擊「使用電子郵件登入」按鈕");
            
            if (!emailInput || !passwordInput) {
                console.error("找不到電子郵件或密碼輸入框");
                return;
            }
            
            const email = emailInput.value;
            const password = passwordInput.value;
            
            if (!email || !password) {
                showStatus('請輸入有效的電子郵件地址和密碼', true);
                return;
            }
            
            // 登入流程
            fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email, password: password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 登入成功，直接進入成功頁面
                    showStatus('登入成功！');
                    if (successPage) showPage(successPage);
                } else {
                    showStatus(data.message || '登入失敗', true);
                }
            })
            .catch(error => {
                console.error('登入時出錯:', error);
                showStatus('登入過程中發生錯誤，請稍後再試', true);
            });
        });
    }
    
    // 確認按鈕點擊事件 - 個人資料提交
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            console.log("[DEBUG] 確認按鈕被點擊");
            
            if (!nameInput || !birthdayInput || !phoneInput) {
                console.error("找不到個人資料輸入框");
                return;
            }
            
            const name = nameInput.value;
            const birthday = birthdayInput.value;
            const phone = phoneInput.value;
            const email = sessionStorage.getItem('userEmail');
            const password = sessionStorage.getItem('userPassword');
            const loginMethod = sessionStorage.getItem('login_method');
            
            console.log("[DEBUG] 準備提交用戶資料:");
            console.log("- 姓名:", name);
            console.log("- 生日:", birthday);
            console.log("- 電話:", phone);
            console.log("- 電子郵件:", email);
            console.log("- 登入方式:", loginMethod);
            
            if (!name || !birthday || !phone) {
                console.log("[ERROR] 必填欄位缺失");
                showStatus('請填寫所有必填欄位', true);
                return;
            }
            
            if (!email) {
                console.log("[ERROR] 無法獲取用戶電子郵件");
                showStatus('無法獲取用戶電子郵件，請重新開始註冊流程', true);
                resetToLogin();
                return;
            }
            
            // 準備用戶數據
            const userData = {
                email: email,
                password: password,
                name: name,
                birthday: birthday,
                phone: phone,
                registrationDate: new Date().toISOString(),
                login_method: loginMethod
            };
            
            // 根據登入方法決定 API 端點
            const apiEndpoint = loginMethod === 'google' ? '/api/update-google-user' : '/api/register';
            
            console.log("[DEBUG] 提交資料到端點:", apiEndpoint);
            
            // 顯示處理中狀態
            showStatus("資料提交中，請稍候...");
            
            // 發送到伺服器
            fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            })
            .then(response => {
                console.log("[DEBUG] 收到伺服器響應:", response.status, response.statusText);
                return response.json();
            })
            .then(data => {
                console.log("[DEBUG] 伺服器返回資料:", data);
                
                if (data.success) {
                    // 清除本地儲存的臨時數據
                    sessionStorage.removeItem('userEmail');
                    sessionStorage.removeItem('userPassword');
                    sessionStorage.removeItem('login_method');
                    
                    // 顯示成功頁面
                    showStatus('註冊成功！');
                    if (successPage) showPage(successPage);
                    
                    console.log("[DEBUG] 切換到成功頁面");
                } else {
                    console.error("[ERROR] 資料提交失敗:", data.message);
                    showStatus('資料提交失敗: ' + data.message, true);
                }
            })
            .catch(error => {
                console.error('[ERROR] 資料提交請求錯誤:', error);
                showStatus('資料提交過程中發生錯誤，請稍後再試', true);
            });
        });
    }
    
    // 繼續按鈕點擊事件 - 成功頁面
    if (continueBtn) {
        continueBtn.addEventListener('click', function() {
            console.log("點擊「繼續」按鈕");
            showStatus('註冊/登入成功！即將進入聊天頁面...', false);
            
            // 轉到聊天頁面
            setTimeout(() => {
                window.location.href = '/chat';
            }, 1500);
        });
    }

    // 檢查是否有 Google 登入重定向返回
    const savedEmail = sessionStorage.getItem('userEmail');
    const loginMethod = sessionStorage.getItem('login_method');
    
    if (savedEmail && loginMethod === 'google' && userInfoPage) {
        console.log("[DEBUG] 檢測到保存的 Google 登入資訊，郵箱:", savedEmail);
        
        // 直接顯示個人資料填寫頁面
        showPage(userInfoPage);
        
        // 確保表單欄位為空
        if (nameInput) nameInput.value = '';
        if (birthdayInput) birthdayInput.value = '';
        if (phoneInput) phoneInput.value = '';
        
        // 更新狀態
        showStatus("請填寫您的個人資料");
        
        // 打印SessionStorage調試信息
        debugSessionStorage();
    }
});