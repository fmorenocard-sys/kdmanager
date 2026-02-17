import * as XLSX from 'xlsx';
console.log("Keys on XLSX namespace:", Object.keys(XLSX));
console.log("XLSX.readFile exists?", typeof XLSX.readFile);
console.log("XLSX.default exists?", !!XLSX.default);
if (XLSX.default) {
    console.log("XLSX.default.readFile exists?", typeof XLSX.default.readFile);
}
