import { DOM } from '../core/state.js';

        function generateStubCode(method) {
            const valType = DOM.stubValue ? DOM.stubValue.value : 'default';
            const customVal = DOM.customValue?.value || '0';
            const ret = method.returnType;
            let instr = '', reg = '.locals 1';
            
            if (ret === 'V') {
                instr = 'return-void';
                reg = '.locals 0';
            } else if (ret === 'Z') {
                instr = `const/4 v0, ${valType === 'true' ? '0x1' : '0x0'}\n    return v0`;
            } else if (['I','S','B','C'].includes(ret)) {
                let v = '0x0';
                if (valType === 'custom') v = '0x' + (parseInt(customVal) || 0).toString(16);
                else if (valType === '1') v = '0x1';
                else if (valType === '-1') v = '-0x1';
                instr = `const/4 v0, ${v}\n    return v0`;
            } else if (ret === 'J') {
                reg = '.locals 2';
                let v = '0x0';
                if (valType === 'custom') v = '0x' + (parseInt(customVal) || 0).toString(16);
                else if (valType === '1') v = '0x1';
                instr = `const-wide/16 v0, ${v}\n    return-wide v0`;
            } else if (ret === 'F') {
                instr = `const v0, ${valType === '1' ? '0x3f800000' : '0x0'}\n    return v0`;
            } else if (ret === 'D') {
                reg = '.locals 2';
                instr = `const-wide v0, ${valType === '1' ? '0x3ff0000000000000L' : '0x0'}\n    return-wide v0`;
            } else {
                instr = `const/4 v0, 0x0\n    return-object v0`;
            }
            
            return `.method ${method.modifiers} ${method.name}(${method.params})${method.returnType}
    ${reg}

    .prologue
    ${instr}
.end method`;
        }

        function updateStubOptions(returnType) {
            let options = '';
            let showContainer = true;
            
            if (returnType === 'V') {
                options = '<option value="void">void (return-void)</option>';
                showContainer = false;
            } else if (returnType === 'Z') {
                options = `
                    <option value="false">false (0x0)</option>
                    <option value="true">true (0x1)</option>
                `;
            } else if (['I','S','B','C','J'].includes(returnType)) {
                options = `
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="-1">-1</option>
                    <option value="custom">Другое...</option>
                `;
            } else if (['F','D'].includes(returnType)) {
                options = `
                    <option value="0">0.0</option>
                    <option value="1">1.0</option>
                    <option value="custom">Другое...</option>
                `;
            } else {
                options = '<option value="null">null</option>';
                showContainer = false;
            }
            
            DOM.stubValue.innerHTML = options;
            DOM.stubValueContainer.style.display = showContainer ? 'block' : 'none';
            DOM.customValueContainer.classList.add('hidden');
        }

export { generateStubCode, updateStubOptions };
