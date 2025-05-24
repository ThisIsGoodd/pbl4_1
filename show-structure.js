const fs = require('fs');
const path = require('path');

function showFolderStructure(dirPath, prefix = '', level = 0, maxLevel = 4) {
  if (level > maxLevel) return;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    // 숨김 파일/폴더와 node_modules 제외
    const filteredItems = items.filter(item => 
      !item.startsWith('.') && 
      item !== 'node_modules' && 
      item !== 'uploads' &&
      item !== 'dist' &&
      item !== 'build'
    );
    
    filteredItems.forEach((item, index) => {
      const itemPath = path.join(dirPath, item);
      const isLast = index === filteredItems.length - 1;
      const currentPrefix = isLast ? '└── ' : '├── ';
      const nextPrefix = isLast ? '    ' : '│   ';
      
      console.log(prefix + currentPrefix + item);
      
      // 디렉토리인 경우 재귀 호출
      if (fs.statSync(itemPath).isDirectory()) {
        showFolderStructure(itemPath, prefix + nextPrefix, level + 1, maxLevel);
      }
    });
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }
}

// 사용법
console.log('📁 프로젝트 폴더 구조 (4레벨까지)');
console.log('='.repeat(50));
showFolderStructure('./');