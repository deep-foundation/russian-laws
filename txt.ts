// import modules
import fs from 'fs';
import { JSDOM } from 'jsdom';

// функция для чтения и обработки HTML файла
async function extractPAndSaveToFile({ htmlFilePath, outputFilePath }: { htmlFilePath: string; outputFilePath: string; }) {
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    const dom = new JSDOM(htmlContent);
    const paragraphs = dom.window.document.querySelectorAll('p');
    const combinedText = Array.from(paragraphs).map(p => p.textContent).join('\n');

    fs.writeFileSync(outputFilePath, combinedText, 'utf8');
    console.log(`Data extracted and saved to ${outputFilePath}`);
}

// Пример использования функции
const htmlFilePath = 'data/html/102041891.html'; // Путь к вашему HTML файлу
const outputFilePath = 'output.txt'; // Путь к файлу для сохранения

extractPAndSaveToFile({ htmlFilePath, outputFilePath });
