import { renderFileTree } from '../project/file-tree.js';
import { syncEditorGeometry, updateLineNumbers } from './editor.js';
import { getMethodCodeByLine } from '../analysis/methods.js';
import { updateChangesTab } from '../changes/changes.js';
import { showToast } from '../ui/toast.js';
import { DOM, state } from '../core/state.js';

        function patchLicenseChecks() {
            // Extended patterns to catch more license-related files
            const licensePatterns = [
                /license/i, /licensing/i, /licensecheck/i, /checkLicense/i,
                /islicensed/i, /validatelicense/i, /licensevalid/i,
                /offlinelicense/i, /ilicense/i, /licensemanager/i,
                /licenseservice/i, /licenseverif/i, /haslicense/i,
                /integrity/i, /gameclient/i, /drm/i, /verification/i, /verify/i,
                /checksum/i, /signature/i, /auth/i, /authenticate/i,
                /play/i, /googleplay/i, /billing/i, /purchase/i
            ];
            
            let patchedCount = 0;
            const patchedFiles = [];
            const patchedMethods = [];
            
            for (const [path, fileData] of state.files) {
                if (!path.endsWith('.smali')) continue;
                
                const fileName = path.toLowerCase();
                const isLicenseFile = licensePatterns.some(p => p.test(fileName));
                
                // Also check if file content contains license-related keywords
                if (!isLicenseFile && fileData.content) {
                    const content = fileData.content.toLowerCase();
                    const hasLicenseKeywords = licensePatterns.some(p => p.test(content));
                    if (!hasLicenseKeywords) continue;
                }
                
                if (isLicenseFile || (fileData.content && licensePatterns.some(p => p.test(fileData.content.toLowerCase())))) {
                    const methods = [];
                    const methodRegex = /^\.method\s+([\w\s-]+)\s+(<?[\w$<>]+>?)\(([^)]*)\)(\[?[VZBSCIJFD]|\[?L[\w/$]+;)/gm;
                    let match;
                    
                    // Extract methods more efficiently
                    const lines = fileData.content.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        const m = lines[i].match(/^\.method\s+([\w\s-]+)\s+(<?[\w$<>]+>?)\(([^)]*)\)(\[?[VZBSCIJFD]|\[?L[\w/$]+;)/);
                        if (m) {
                            methods.push({
                                name: m[2],
                                modifiers: m[1].trim(),
                                params: m[3],
                                returnType: m[4],
                                line: i + 1
                            });
                        }
                    }
                    
                    let modified = false;
                    for (const method of methods) {
                        const ret = method.returnType;
                        // Patch boolean methods to return true (licensed)
                        if (ret === 'Z') {
                            const oldCode = getMethodCodeByLine(path, method.line);
                            if (oldCode && !oldCode.includes('# PATCHED')) {
                                const stubCode = `.method ${method.modifiers} ${method.name}(${method.params})Z
    .locals 1
    # PATCHED - License check bypassed
    const/4 v0, 0x1
    return v0
.end method`;
                                
                                // Store original content for proper diff tracking
                                const originalContent = fileData.content;
                                fileData.content = fileData.content.replace(oldCode, stubCode);
                                
                                // Check if replacement was successful
                                if (originalContent !== fileData.content) {
                                    modified = true;
                                    patchedCount++;
                                    patchedMethods.push({
                                        file: path,
                                        method: method.name,
                                        original: oldCode,
                                        patched: stubCode
                                    });
                                    
                                    // Track the change properly
                                    if (!state.fileChanges.has(path)) {
                                        state.fileChanges.set(path, []);
                                    }
                                    state.fileChanges.get(path).push({
                                        methodName: method.name,
                                        oldCode: oldCode,
                                        newCode: stubCode,
                                        timestamp: Date.now()
                                    });
                                } else {
                                    // If replacement failed, restore original content
                                    fileData.content = originalContent;
                                }
                            }
                        }
                        // Patch void methods (just return)
                        else if (ret === 'V' && /check|verify|validate|license|auth|verify/i.test(method.name)) {
                            const oldCode = getMethodCodeByLine(path, method.line);
                            if (oldCode && !oldCode.includes('# PATCHED')) {
                                const stubCode = `.method ${method.modifiers} ${method.name}(${method.params})V
    .locals 0
    # PATCHED - License check bypassed
    return-void
.end method`;
                                
                                const originalContent = fileData.content;
                                fileData.content = fileData.content.replace(oldCode, stubCode);
                                
                                if (originalContent !== fileData.content) {
                                    modified = true;
                                    patchedCount++;
                                    patchedMethods.push({
                                        file: path,
                                        method: method.name,
                                        original: oldCode,
                                        patched: stubCode
                                    });
                                    
                                    if (!state.fileChanges.has(path)) {
                                        state.fileChanges.set(path, []);
                                    }
                                    state.fileChanges.get(path).push({
                                        methodName: method.name,
                                        oldCode: oldCode,
                                        newCode: stubCode,
                                        timestamp: Date.now()
                                    });
                                } else {
                                    fileData.content = originalContent;
                                }
                            }
                        }
                        // Patch methods that return objects (return null to bypass checks)
                        else if (ret !== 'V' && /check|verify|validate|license|auth|verify/i.test(method.name)) {
                            const oldCode = getMethodCodeByLine(path, method.line);
                            if (oldCode && !oldCode.includes('# PATCHED')) {
                                const stubCode = `.method ${method.modifiers} ${method.name}(${method.params})${ret}
    .locals 1
    # PATCHED - License check bypassed
    const/4 v0, 0x0
    return-object v0
.end method`;
                                
                                const originalContent = fileData.content;
                                fileData.content = fileData.content.replace(oldCode, stubCode);
                                
                                if (originalContent !== fileData.content) {
                                    modified = true;
                                    patchedCount++;
                                    patchedMethods.push({
                                        file: path,
                                        method: method.name,
                                        original: oldCode,
                                        patched: stubCode
                                    });
                                    
                                    if (!state.fileChanges.has(path)) {
                                        state.fileChanges.set(path, []);
                                    }
                                    state.fileChanges.get(path).push({
                                        methodName: method.name,
                                        oldCode: oldCode,
                                        newCode: stubCode,
                                        timestamp: Date.now()
                                    });
                                } else {
                                    fileData.content = originalContent;
                                }
                            }
                        }
                    }
                    
                    if (modified) {
                        fileData.modified = true;
                        fileData.original = fileData.content; // Update original for diff tracking
                        patchedFiles.push(path.split('/').pop());
                    }
                }
            }
            
            if (patchedCount > 0) {
                updateChangesTab();
                renderFileTree();
                
                if (state.currentFile && state.files.get(state.currentFile)?.modified) {
                    DOM.codeEditor.value = state.files.get(state.currentFile).content;
                    syncEditorGeometry();
                    updateLineNumbers();
                    updateSyntaxHighlight();
                }
                
                showToast(`Пропатчено ${patchedCount} методов в ${patchedFiles.length} файлах`, 'success');
            } else {
                showToast('Файлы лицензии не найдены или уже пропатчены', 'info');
            }
        }

export { patchLicenseChecks };
