import fs from 'fs';
import path from 'path';

function saveFile(filePath: string, content: string) {
    const outputDir = path.dirname(filePath);
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
}


export {saveFile};