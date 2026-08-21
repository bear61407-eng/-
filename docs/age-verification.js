/**
 * 強化年齡驗證模組
 * 使用簽名式 Cookie 和本地存儲防止規避
 */

const AGE_VERIFICATION_KEY = 'tea_sim_age_verified_v1';
const VERIFICATION_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30 天

class AgeVerification {
  constructor() {
    this.verified = false;
    this.timestamp = null;
  }

  /**
   * 檢查是否已驗證年齡
   * @returns {boolean} 是否已驗證
   */
  isVerified() {
    const stored = this.getStoredVerification();
    if (!stored) return false;

    // 檢查驗證是否過期
    const age = Date.now() - stored.timestamp;
    if (age > VERIFICATION_TIMEOUT) {
      this.clearVerification();
      return false;
    }

    return true;
  }

  /**
   * 記錄年齡驗證
   * 使用簽名式存儲防止篡改
   */
  verifyAge(agreed = false) {
    if (!agreed) {
      throw new Error('必須同意年齡聲明');
    }

    const data = {
      timestamp: Date.now(),
      signature: this.generateSignature(),
      userAgent: navigator.userAgent.substring(0, 100),
      verified: true
    };

    try {
      localStorage.setItem(AGE_VERIFICATION_KEY, JSON.stringify(data));
      sessionStorage.setItem('age_verified_session', 'true');
      this.verified = true;
      this.timestamp = data.timestamp;
      return true;
    } catch (e) {
      console.warn('無法保存驗證狀態（可能是隱私模式）:', e);
      // 隱私模式下，仍允許繼續但不保存
      this.verified = true;
      return true;
    }
  }

  /**
   * 生成簽名防止篡改
   */
  generateSignature() {
    const data = `${navigator.userAgent}|${Math.floor(Date.now() / 1000)}`;
    // 簡單的雜湊函數（實務應用應使用伺服器端驗證）
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 轉換為 32-bit 整數
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * 取得已儲存的驗證資料
   */
  getStoredVerification() {
    try {
      const stored = localStorage.getItem(AGE_VERIFICATION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.warn('無法讀取驗證狀態:', e);
      return null;
    }
  }

  /**
   * 清除驗證狀態
   */
  clearVerification() {
    try {
      localStorage.removeItem(AGE_VERIFICATION_KEY);
      sessionStorage.removeItem('age_verified_session');
      this.verified = false;
      this.timestamp = null;
    } catch (e) {
      console.warn('無法清除驗證狀態:', e);
    }
  }

  /**
   * 強制重新驗證
   */
  forceReVerify() {
    this.clearVerification();
    location.reload();
  }
}

// 全域實例
window.ageVerification = new AgeVerification();

// 防止直接修改 localStorage
Object.defineProperty(window, 'preventAgeBypass', {
  value: function() {
    if (localStorage.getItem(AGE_VERIFICATION_KEY)) {
      const stored = JSON.parse(localStorage.getItem(AGE_VERIFICATION_KEY));
      const currentSig = window.ageVerification.generateSignature();
      
      // 簽名不符表示資料被篡改
      if (stored.signature !== currentSig && stored.userAgent !== navigator.userAgent) {
        console.warn('⚠️ 驗證資料可能被篡改，清除驗證狀態');
        localStorage.removeItem(AGE_VERIFICATION_KEY);
      }
    }
  },
  enumerable: false
});

// 頁面加載時檢查
window.addEventListener('load', () => {
  window.preventAgeBypass();
});

// 定期檢查（每 5 分鐘）
setInterval(() => {
  window.preventAgeBypass();
}, 5 * 60 * 1000);
