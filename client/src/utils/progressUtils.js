// 简化版本的进度管理工具
// 数据库是唯一的数据源，不使用localStorage缓存


// 从数据库获取进度（简化日志）
export const getProgressFromDatabase = async (bookUuid, username) => {
  try {
    const response = await fetch(`/api/progress/${username}/${bookUuid}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.progress) {
        console.log(`📖 加载进度: ${data.progress.current_cfi || '无进度'}`);
        return data.progress;
      }
    } else if (response.status === 404) {
      return null;
    }
  } catch (error) {
    console.error('加载进度失败:', error);
  }
  return null;
};

// 保存进度到数据库（简化日志）
export const saveProgressToDatabase = async (bookUuid, cfi, username) => {
  try {
    const response = await fetch(`/api/progress/${username}/${bookUuid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentCfi: cfi })
    });

    if (response.ok) {
      return true;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('保存失败:', error);
    return false;
  }
};


// 简化的进度加载：数据库是唯一数据源
export const getBestProgress = async (bookUuid, username) => {
  // 直接从数据库获取进度，无任何缓存逻辑
  return await getProgressFromDatabase(bookUuid, username);
};

