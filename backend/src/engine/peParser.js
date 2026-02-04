const logger = require('../utils/logger');

/**
 * PE (Portable Executable) File Parser
 * Analyzes Windows executable file structure for malware detection
 */
class PEParser {
    constructor() {
        // Common packer signatures
        this.packerSignatures = {
            'UPX': [0x55, 0x50, 0x58, 0x21], // UPX!
            'ASPack': [0x60, 0xE8, 0x03, 0x00, 0x00, 0x00],
            'PECompact': [0x50, 0x45, 0x43, 0x6F, 0x6D, 0x70, 0x61, 0x63, 0x74],
            'Themida': [0x68, 0x00, 0x00, 0x00, 0x00, 0x68],
            'VMProtect': [0x68, 0x00, 0x00, 0x00, 0x00, 0x50]
        };

        // Suspicious imports that indicate malicious behavior
        this.suspiciousImports = [
            'VirtualAlloc', 'VirtualAllocEx', 'VirtualProtect', 'VirtualProtectEx',
            'WriteProcessMemory', 'ReadProcessMemory', 'CreateRemoteThread',
            'NtUnmapViewOfSection', 'SetWindowsHookEx', 'GetAsyncKeyState',
            'CreateToolhelp32Snapshot', 'Process32First', 'Process32Next',
            'OpenProcess', 'TerminateProcess', 'CreateService', 'StartService',
            'RegSetValueEx', 'RegCreateKeyEx', 'URLDownloadToFile',
            'InternetOpen', 'InternetConnect', 'HttpSendRequest',
            'IsDebuggerPresent', 'CheckRemoteDebuggerPresent', 'OutputDebugString'
        ];
    }

    /**
     * Parse PE file structure
     */
    async parsePE(buffer) {
        try {
            // Check DOS header
            if (buffer.length < 64) {
                return { isPE: false, error: 'File too small to be PE' };
            }

            // DOS signature check (MZ)
            const dosSignature = buffer.readUInt16LE(0);
            if (dosSignature !== 0x5A4D) {
                return { isPE: false, error: 'Invalid DOS signature' };
            }

            // Get PE header offset
            const peOffset = buffer.readUInt32LE(60);
            if (peOffset + 4 > buffer.length) {
                return { isPE: false, error: 'Invalid PE offset' };
            }

            // PE signature check (PE\0\0)
            const peSignature = buffer.readUInt32LE(peOffset);
            if (peSignature !== 0x00004550) {
                return { isPE: false, error: 'Invalid PE signature' };
            }

            // Parse COFF header
            const coffHeader = this.parseCOFFHeader(buffer, peOffset + 4);

            // Parse Optional header
            const optionalHeader = this.parseOptionalHeader(buffer, peOffset + 24, coffHeader.sizeOfOptionalHeader);

            // Parse sections
            const sectionsOffset = peOffset + 24 + coffHeader.sizeOfOptionalHeader;
            const sections = this.parseSections(buffer, sectionsOffset, coffHeader.numberOfSections);

            // Parse imports
            const imports = this.parseImports(buffer, optionalHeader, sections);

            // Analyze for anomalies
            const anomalies = this.detectAnomalies(coffHeader, optionalHeader, sections);

            // Detect packer
            const packerInfo = this.detectPacker(buffer, sections);

            // Calculate section entropies
            const sectionEntropies = this.calculateSectionEntropies(buffer, sections);

            return {
                isPE: true,
                coffHeader,
                optionalHeader,
                sections,
                imports,
                anomalies,
                packerInfo,
                sectionEntropies,
                analysis: this.analyzeStructure(coffHeader, optionalHeader, sections, imports, sectionEntropies)
            };

        } catch (error) {
            logger.error('PE parsing failed', { error: error.message });
            return { isPE: false, error: error.message };
        }
    }

    /**
     * Parse COFF header
     */
    parseCOFFHeader(buffer, offset) {
        return {
            machine: buffer.readUInt16LE(offset),
            numberOfSections: buffer.readUInt16LE(offset + 2),
            timeDateStamp: buffer.readUInt32LE(offset + 4),
            pointerToSymbolTable: buffer.readUInt32LE(offset + 8),
            numberOfSymbols: buffer.readUInt32LE(offset + 12),
            sizeOfOptionalHeader: buffer.readUInt16LE(offset + 16),
            characteristics: buffer.readUInt16LE(offset + 18)
        };
    }

    /**
     * Parse Optional header
     */
    parseOptionalHeader(buffer, offset, size) {
        if (size === 0) return null;

        const magic = buffer.readUInt16LE(offset);
        const is64bit = magic === 0x20b;

        return {
            magic,
            is64bit,
            addressOfEntryPoint: buffer.readUInt32LE(offset + 16),
            imageBase: is64bit ? buffer.readBigUInt64LE(offset + 24) : buffer.readUInt32LE(offset + 28),
            sectionAlignment: buffer.readUInt32LE(offset + 32),
            fileAlignment: buffer.readUInt32LE(offset + 36),
            sizeOfImage: buffer.readUInt32LE(offset + 56),
            sizeOfHeaders: buffer.readUInt32LE(offset + 60),
            checkSum: buffer.readUInt32LE(offset + 64),
            subsystem: buffer.readUInt16LE(offset + 68),
            dllCharacteristics: buffer.readUInt16LE(offset + 70)
        };
    }

    /**
     * Parse section headers
     */
    parseSections(buffer, offset, count) {
        const sections = [];
        const sectionSize = 40;

        for (let i = 0; i < count; i++) {
            const sectionOffset = offset + (i * sectionSize);

            // Read section name (8 bytes)
            let name = '';
            for (let j = 0; j < 8; j++) {
                const char = buffer.readUInt8(sectionOffset + j);
                if (char !== 0) name += String.fromCharCode(char);
            }

            sections.push({
                name: name.trim(),
                virtualSize: buffer.readUInt32LE(sectionOffset + 8),
                virtualAddress: buffer.readUInt32LE(sectionOffset + 12),
                sizeOfRawData: buffer.readUInt32LE(sectionOffset + 16),
                pointerToRawData: buffer.readUInt32LE(sectionOffset + 20),
                characteristics: buffer.readUInt32LE(sectionOffset + 36)
            });
        }

        return sections;
    }

    /**
     * Parse import table (simplified)
     */
    parseImports(buffer, optionalHeader, sections) {
        const imports = [];

        try {
            // This is a simplified version - full implementation would parse the import directory table
            // For now, we'll scan for common import names in the file
            const fileContent = buffer.toString('binary');

            for (const importName of this.suspiciousImports) {
                if (fileContent.includes(importName)) {
                    imports.push(importName);
                }
            }
        } catch (error) {
            logger.warn('Import parsing failed', { error: error.message });
        }

        return imports;
    }

    /**
     * Detect structural anomalies
     */
    detectAnomalies(coffHeader, optionalHeader, sections) {
        const anomalies = [];

        // Check for unusual number of sections
        if (coffHeader.numberOfSections > 10) {
            anomalies.push('Unusually high number of sections');
        } else if (coffHeader.numberOfSections < 2) {
            anomalies.push('Unusually low number of sections');
        }

        // Check for misaligned sections
        if (optionalHeader && optionalHeader.sectionAlignment !== optionalHeader.fileAlignment) {
            if (optionalHeader.sectionAlignment < 0x1000) {
                anomalies.push('Suspicious section alignment');
            }
        }

        // Check for executable sections with suspicious names
        for (const section of sections) {
            const isExecutable = (section.characteristics & 0x20000000) !== 0;
            const isWritable = (section.characteristics & 0x80000000) !== 0;

            if (isExecutable && isWritable) {
                anomalies.push(`Section ${section.name} is both executable and writable`);
            }

            // Check for non-standard section names
            const standardSections = ['.text', '.data', '.rdata', '.bss', '.rsrc', '.reloc', '.idata', '.edata'];
            if (!standardSections.includes(section.name) && section.name.length > 0) {
                anomalies.push(`Non-standard section name: ${section.name}`);
            }
        }

        // Check entry point
        if (optionalHeader && optionalHeader.addressOfEntryPoint === 0) {
            anomalies.push('Entry point is zero');
        }

        return anomalies;
    }

    /**
     * Detect packer signatures
     */
    detectPacker(buffer, sections) {
        const detected = [];

        // Check for packer signatures in the first 1KB
        const headerData = buffer.slice(0, Math.min(1024, buffer.length));

        for (const [packerName, signature] of Object.entries(this.packerSignatures)) {
            if (this.containsSignature(headerData, signature)) {
                detected.push(packerName);
            }
        }

        // Check for high entropy sections (common in packed files)
        const highEntropySections = sections.filter(s => {
            const entropy = this.calculateSectionEntropy(buffer, s);
            return entropy > 7.5;
        });

        return {
            detected: detected,
            isPacked: detected.length > 0 || highEntropySections.length > 0,
            highEntropySections: highEntropySections.map(s => s.name),
            confidence: detected.length > 0 ? 0.9 : (highEntropySections.length > 0 ? 0.6 : 0.1)
        };
    }

    /**
     * Check if buffer contains signature
     */
    containsSignature(buffer, signature) {
        for (let i = 0; i <= buffer.length - signature.length; i++) {
            let match = true;
            for (let j = 0; j < signature.length; j++) {
                if (buffer[i + j] !== signature[j]) {
                    match = false;
                    break;
                }
            }
            if (match) return true;
        }
        return false;
    }

    /**
     * Calculate entropy for a section
     */
    calculateSectionEntropy(buffer, section) {
        try {
            const start = section.pointerToRawData;
            const size = Math.min(section.sizeOfRawData, buffer.length - start);

            if (start + size > buffer.length || size === 0) {
                return 0;
            }

            const sectionData = buffer.slice(start, start + size);
            return this.calculateEntropy(sectionData);
        } catch {
            return 0;
        }
    }

    /**
     * Calculate entropies for all sections
     */
    calculateSectionEntropies(buffer, sections) {
        return sections.map(section => ({
            name: section.name,
            entropy: this.calculateSectionEntropy(buffer, section),
            size: section.sizeOfRawData
        }));
    }

    /**
     * Calculate Shannon entropy
     */
    calculateEntropy(buffer) {
        const freq = new Array(256).fill(0);
        for (let i = 0; i < buffer.length; i++) {
            freq[buffer[i]]++;
        }

        let entropy = 0;
        for (let i = 0; i < 256; i++) {
            if (freq[i] > 0) {
                const p = freq[i] / buffer.length;
                entropy -= p * Math.log2(p);
            }
        }
        return entropy;
    }

    /**
     * Analyze PE structure and generate risk score
     */
    analyzeStructure(coffHeader, optionalHeader, sections, imports, sectionEntropies) {
        let score = 0;
        const reasons = [];

        // Suspicious imports
        const suspiciousImportCount = imports.length;
        if (suspiciousImportCount > 0) {
            score += Math.min(suspiciousImportCount * 5, 40);
            reasons.push(`${suspiciousImportCount} suspicious imports detected`);
        }

        // High entropy sections
        const highEntropySections = sectionEntropies.filter(s => s.entropy > 7.5);
        if (highEntropySections.length > 0) {
            score += 30;
            reasons.push(`${highEntropySections.length} high-entropy sections (possible packing)`);
        }

        // Executable + Writable sections
        const execWritableSections = sections.filter(s => {
            const isExecutable = (s.characteristics & 0x20000000) !== 0;
            const isWritable = (s.characteristics & 0x80000000) !== 0;
            return isExecutable && isWritable;
        });
        if (execWritableSections.length > 0) {
            score += 25;
            reasons.push('Sections with both executable and writable permissions');
        }

        // Non-standard sections
        const standardSections = ['.text', '.data', '.rdata', '.bss', '.rsrc', '.reloc', '.idata', '.edata'];
        const nonStandardSections = sections.filter(s => !standardSections.includes(s.name) && s.name.length > 0);
        if (nonStandardSections.length > 0) {
            score += 15;
            reasons.push(`${nonStandardSections.length} non-standard section names`);
        }

        return {
            score: Math.min(score, 100),
            verdict: score > 50 ? 'suspicious' : 'normal',
            reasons,
            importCount: imports.length,
            sectionCount: sections.length,
            maxSectionEntropy: Math.max(...sectionEntropies.map(s => s.entropy), 0)
        };
    }
}

// Singleton instance
const peParser = new PEParser();

module.exports = {
    PEParser,
    peParser,
    parsePE: async (buffer) => peParser.parsePE(buffer)
};
