from flask import Flask, request, jsonify, render_template, send_from_directory
import sqlite3
import os
import json
import bcrypt
from flask_cors import CORS
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from datetime import datetime
import traceback  # 用於打印詳細的堆疊跟踪
import requests

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)  # 啟用跨域資源共享

# 設定應用程式根目錄的絕對路徑
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
# 設定資料庫檔案的絕對路徑
DB_PATH = os.path.join(BASE_DIR, 'database.db')

# 聊天機器人設定
USE_HEADERS = False
LLM_URL = "http://localhost:8000/completion"  # 改成對方模型的 API endpoint
HEADERS = {
    "Content-Type": "application/json",
    "API-Key": "TZPR901-S20MAEK-N8XF063-YNK8EJ9"
}

def init_db():
    # 確保資料庫目錄存在
    db_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(db_dir) and db_dir:
        os.makedirs(db_dir)
        print(f"已創建資料庫目錄: {db_dir}")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # 創建 users 表
        c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT,
            name TEXT,
            birthday TEXT,
            phone TEXT,
            registration_date TEXT,
            login_method TEXT
        )
        ''')
        
        conn.commit()
        
        # 確認表格是否創建成功
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
        if c.fetchone():
            print("資料庫表 'users' 已成功創建")
        else:
            print("警告: 資料庫表 'users' 創建失敗")
        
        conn.close()
        print(f"資料庫初始化完成，路徑: {DB_PATH}")
        
    except Exception as e:
        print(f"初始化資料庫時發生錯誤: {str(e)}")
        import traceback
        traceback.print_exc()

# 應用啟動時初始化資料庫
init_db()

# Google OAuth 配置（需要替換為您自己的用戶端 ID）
GOOGLE_CLIENT_ID = "411255601205-g39rum5fuh1edi6bpklg5r11j5qq3pnu.apps.googleusercontent.com"  # 注意：這必須與前端使用的Client ID相同
print(f"使用的 Google 客戶端 ID: {GOOGLE_CLIENT_ID}")

# 檢查資料庫狀態的路由 - 方便診斷
@app.route('/check-db')
def check_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = c.fetchall()
        
        # 檢查 users 表的結構
        c.execute("PRAGMA table_info(users);")
        columns = c.fetchall()
        
        conn.close()
        
        return jsonify({
            "database_path": DB_PATH,
            "database_exists": os.path.exists(DB_PATH),
            "tables": [table[0] for table in tables],
            "users_columns": [col[1] for col in columns] if any(table[0] == 'users' for table in tables) else []
        })
    except Exception as e:
        return jsonify({
            "error": str(e),
            "traceback": traceback.format_exc()
        })

# 主頁面 - 提供登入/註冊介面
@app.route('/')
def index():
    return render_template('index.html')

# 管理介面
@app.route('/admin')
def admin():
    return render_template('admin.html')

# 聊天頁面
@app.route('/chat')
def chat_page():
    return render_template('chat.html')

# 處理聊天API
@app.route("/chat", methods=["POST"])
def chat_api():
    user_message = request.json.get("message", "")
    # 預設傳送格式（根據模型需要修改）
    payload = {
        "prompt": user_message,
        "n_predict": 128
    }
    try:
        if USE_HEADERS:
            response = requests.post(LLM_URL, headers=HEADERS, json=payload)
        else:
            response = requests.post(LLM_URL, json=payload)
        result = response.json()
        # 自動嘗試找出模型的回覆欄位
        ai_answer = result.get("content") or result.get("reply") or result.get("output") or str(result)
        return jsonify({"reply": ai_answer})
    except Exception as e:
        return jsonify({"reply": f"錯誤：{str(e)}"})

# 處理電子郵件註冊
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    print("收到註冊請求:", data)
    
    email = data.get('email')
    password = data.get('password')  # 獲取密碼
    name = data.get('name')
    birthday = data.get('birthday')
    phone = data.get('phone')
    registration_date = data.get('registrationDate', datetime.now().isoformat())
    login_method = 'email'
    
    # 確保所有必要欄位都有值
    if not all([email, password, name, birthday, phone]):
        return jsonify({"success": False, "message": "所有欄位都是必填的"}), 400
    
    try:
        # 雜湊密碼
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute(
            "INSERT INTO users (email, password, name, birthday, phone, registration_date, login_method) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (email, hashed_password, name, birthday, phone, registration_date, login_method)
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "註冊成功！"})
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": "此電子郵件已註冊"}), 409
    except Exception as e:
        print("註冊錯誤:", str(e))
        traceback.print_exc()  # 打印詳細錯誤堆疊
        return jsonify({"success": False, "message": str(e)}), 500

# 處理 Google 登入 - 改進版本
@app.route('/api/google-login', methods=['POST'])
def google_login():
    data = request.json
    token = data.get('token')
    
    print("\n--- Google 登入請求開始 ---")
    print(f"收到 Google 登入請求，令牌長度: {len(token) if token else '無令牌'}")
    
    if not token:
        print("錯誤: 未提供令牌")
        return jsonify({"success": False, "message": "未提供令牌"}), 400
    
    try:
        # 驗證 Google 令牌
        print("開始驗證 Google 令牌...")
        # 創建 Request 對象
        request_obj = google_requests.Request()
        print("Request 對象創建成功")
        
        # 驗證令牌
        idinfo = id_token.verify_oauth2_token(token, request_obj, GOOGLE_CLIENT_ID)
        print("令牌驗證成功")
        print(f"令牌內容摘要: {idinfo.get('email')}, 發行者: {idinfo.get('iss')}")
        
        # 檢查令牌是否過期
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            print(f"錯誤: 無效的令牌發行者: {idinfo['iss']}")
            return jsonify({"success": False, "message": "無效的令牌發行者"}), 401
        
        # 從令牌取得使用者資訊
        email = idinfo['email']
        print(f"Google 登入用戶 email: {email}")
        
        # 檢查使用者是否已存在
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE email = ?", (email,))
        existing_user = c.fetchone()
        conn.close()
        
        if existing_user:
            # 使用者已存在，返回成功
            print("現有用戶，登入成功")
            print("--- Google 登入請求結束 ---\n")
            return jsonify({
                "success": True, 
                "message": "登入成功", 
                "isNewUser": False
            })
        else:
            # 新使用者，需要收集更多資訊
            print("新 Google 用戶，需要更多資訊")
            print("--- Google 登入請求結束 ---\n")
            return jsonify({
                "success": True, 
                "message": "需要更多資訊", 
                "isNewUser": True, 
                "email": email
            })
    
    except ValueError as e:
        # 令牌無效
        print(f"錯誤: 令牌驗證錯誤 (ValueError): {str(e)}")
        traceback.print_exc()
        print("--- Google 登入請求結束 (失敗) ---\n")
        return jsonify({"success": False, "message": "無效的令牌: " + str(e)}), 401
    except Exception as e:
        print(f"錯誤: Google 登入處理錯誤 (其他例外): {str(e)}, 類型: {type(e)}")
        traceback.print_exc()
        print("--- Google 登入請求結束 (失敗) ---\n")
        return jsonify({"success": False, "message": "處理 Google 登入時發生錯誤: " + str(e)}), 500

# 更新 Google 登入使用者的資訊
@app.route('/api/update-google-user', methods=['POST'])
def update_google_user():
    data = request.json
    print("\n--- 更新 Google 用戶資料請求開始 ---")
    print("收到更新 Google 用戶資料請求:", data)
    
    email = data.get('email')
    name = data.get('name')
    birthday = data.get('birthday')
    phone = data.get('phone')
    registration_date = data.get('registrationDate', datetime.now().isoformat())
    login_method = 'google'
    
    # 確保所有必要欄位都有值
    if not all([email, name, birthday, phone]):
        print("錯誤: 缺少必填欄位")
        print("--- 更新 Google 用戶資料請求結束 (失敗) ---\n")
        return jsonify({"success": False, "message": "所有欄位都是必填的"}), 400
    
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute(
            "INSERT INTO users (email, password, name, birthday, phone, registration_date, login_method) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (email, None, name, birthday, phone, registration_date, login_method)  # Google 登入用戶沒有密碼
        )
        conn.commit()
        conn.close()
        print("Google 用戶資料更新成功")
        print("--- 更新 Google 用戶資料請求結束 (成功) ---\n")
        return jsonify({"success": True, "message": "資料更新成功！"})
    except sqlite3.IntegrityError:
        print("錯誤: 此電子郵件已註冊")
        print("--- 更新 Google 用戶資料請求結束 (失敗) ---\n")
        return jsonify({"success": False, "message": "此電子郵件已註冊"}), 409
    except Exception as e:
        print(f"錯誤: 更新 Google 用戶錯誤: {str(e)}")
        traceback.print_exc()
        print("--- 更新 Google 用戶資料請求結束 (失敗) ---\n")
        return jsonify({"success": False, "message": str(e)}), 500

# 檢查電子郵件是否已存在
@app.route('/api/check-email', methods=['POST'])
def check_email():
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({"success": False, "message": "未提供電子郵件"}), 400
    
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE email = ?", (email,))
        existing_user = c.fetchone()
        conn.close()
        
        return jsonify({
            "success": True,
            "exists": existing_user is not None
        })
    except Exception as e:
        print(f"檢查電子郵件錯誤: {str(e)}")
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

# 處理用戶登入
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    print(f"收到登入請求: {email}")
    
    if not email or not password:
        return jsonify({"success": False, "message": "請提供電子郵件和密碼"}), 400
    
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = c.fetchone()
        conn.close()
        
        if user:
            # 檢查使用者是否使用 Google 登入
            if user[7] == 'google':
                return jsonify({
                    "success": False,
                    "message": "此帳號使用 Google 登入，請選擇 Google 登入方式"
                }), 400
            
            # 檢查密碼是否匹配
            stored_password = user[2]  # 密碼是表中的第三個欄位（索引為2）
            
            # 如果有密碼存儲（可能是舊用戶沒有密碼）
            if stored_password:
                try:
                    # 檢查密碼是否正確
                    if bcrypt.checkpw(password.encode('utf-8'), stored_password):
                        return jsonify({
                            "success": True,
                            "message": "登入成功"
                        })
                    else:
                        return jsonify({
                            "success": False, 
                            "message": "密碼不正確"
                        }), 401
                except Exception as e:
                    # 處理密碼驗證錯誤
                    print(f"密碼驗證錯誤: {str(e)}")
                    traceback.print_exc()
                    return jsonify({
                        "success": False,
                        "message": "密碼驗證錯誤: " + str(e)
                    }), 500
            else:
                return jsonify({
                    "success": False,
                    "message": "此帳號未設置密碼"
                }), 400
        else:
            return jsonify({
                "success": False,
                "message": "用戶不存在"
            }), 404
    except Exception as e:
        print(f"登入錯誤: {str(e)}")
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

# 提供靜態文件
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# 刪除指定 ID 的用戶
@app.route('/api/delete-user', methods=['POST'])
def delete_user():
    data = request.json
    user_id = data.get('id')
    
    if not user_id:
        return jsonify({"success": False, "message": "未提供用戶 ID"}), 400
    
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("DELETE FROM users WHERE id = ?", (user_id,))
        
        # 檢查是否有行被刪除
        if conn.total_changes > 0:
            conn.commit()
            conn.close()
            return jsonify({"success": True, "message": f"ID 為 {user_id} 的用戶已成功刪除"})
        else:
            conn.close()
            return jsonify({"success": False, "message": "找不到指定 ID 的用戶"}), 404
    
    except Exception as e:
        print(f"刪除用戶錯誤: {str(e)}")
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

# 批量刪除用戶
@app.route('/api/delete-users', methods=['POST'])
def delete_multiple_users():
    data = request.json
    user_ids = data.get('ids', [])
    
    if not user_ids or not isinstance(user_ids, list):
        return jsonify({"success": False, "message": "未提供有效的用戶 ID 列表"}), 400
    
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # 構建 SQL 查詢，使用參數化查詢避免 SQL 注入
        placeholders = ','.join(['?' for _ in user_ids])
        query = f"DELETE FROM users WHERE id IN ({placeholders})"
        
        c.execute(query, user_ids)
        
        # 檢查是否有行被刪除
        if conn.total_changes > 0:
            conn.commit()
            conn.close()
            return jsonify({"success": True, "message": f"已成功刪除 {conn.total_changes} 位用戶"})
        else:
            conn.close()
            return jsonify({"success": False, "message": "找不到指定 ID 的用戶"}), 404
    
    except Exception as e:
        print(f"批量刪除用戶錯誤: {str(e)}")
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

# 清空所有用戶
@app.route('/api/clear-users', methods=['POST'])
def clear_all_users():
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("DELETE FROM users")
        
        # 檢查是否有行被刪除
        deleted_count = conn.total_changes
        conn.commit()
        conn.close()
        
        return jsonify({
            "success": True, 
            "message": f"已成功刪除所有用戶 (共 {deleted_count} 筆資料)"
        })
    
    except Exception as e:
        print(f"清空用戶錯誤: {str(e)}")
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

# 取得所有用戶列表
@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row  # 使結果可以通過列名訪問
        c = conn.cursor()
        c.execute("SELECT * FROM users")
        users = [dict(row) for row in c.fetchall()]
        conn.close()
        
        return jsonify({
            "success": True,
            "users": users
        })
    
    except Exception as e:
        print(f"獲取用戶列表錯誤: {str(e)}")
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

# 強制重新初始化資料庫
@app.route('/api/init-db', methods=['POST'])
def force_init_db():
    try:
        init_db()
        return jsonify({
            "success": True,
            "message": "資料庫初始化完成"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5011)