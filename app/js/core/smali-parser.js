        function detectClassType(c) {
            if (c.includes('Activity;')) return 'activity';
            if (c.includes('Service;')) return 'service';
            if (/\.class\s+.*interface/.test(c)) return 'interface';
            return 'class';
        }

        function extractClassInfo(content) {
            const info = {
                type: detectClassType(content),
                superClass: null,
                interfaces: [],
                fields: [],
                methods: [],
                source: null,
                annotations: []
            };
            
            const superMatch = content.match(/^\.super\s+(L[\w\/$]+;)/m);
            if (superMatch) info.superClass = superMatch[1];
            
            const sourceMatch = content.match(/^\.source\s+"([^"]+)"/m);
            if (sourceMatch) info.source = sourceMatch[1];
            
            const implRegex = /^\.implements\s+(L[\w\/$]+;)/gm;
            let im;
            while ((im = implRegex.exec(content)) !== null) {
                info.interfaces.push(im[1]);
            }
            
            const fieldRegex = /^\.field\s+([\w\s-]+)\s+([\w$]+):([\w\/$\[;]+)/gm;
            let fm;
            while ((fm = fieldRegex.exec(content)) !== null) {
                info.fields.push({ modifiers: fm[1].trim(), name: fm[2], type: fm[3] });
            }
            
            const methodRegex = /^\.method\s+([\w\s-]+)\s+([<\w$>]+)\(([^)]*)\)([\w\/$\[;]+)/gm;
            let mm;
            while ((mm = methodRegex.exec(content)) !== null) {
                info.methods.push({ modifiers: mm[1].trim(), name: mm[2], params: mm[3], returnType: mm[4] });
            }
            
            const annotationRegex = /^\.annotation\s+[\w\s]+\s+(L[\w\/$]+;)/gm;
            let am;
            while ((am = annotationRegex.exec(content)) !== null) {
                if (!info.annotations.includes(am[1])) info.annotations.push(am[1]);
            }
            
            return info;
        }

        function extractClassName(content) {
            const m = content.match(/^\.class\s+(?:[\w\s]+)?(L[\w\/$]+;)/m);
            return m ? m[1] : null;
        }

        function extractDependencies(content, self) {
            const deps = new Set();
            const r = /L[\w\/$]+;/g;
            let m;
            while ((m = r.exec(content)) !== null) {
                if (m[0] !== self && !m[0].startsWith('Ljava/') && !m[0].startsWith('Landroid/') && !m[0].startsWith('Lkotlin/')) {
                    deps.add(m[0]);
                }
            }
            return Array.from(deps);
        }

        function formatSmaliType(type) {
            if (!type) return 'void';
            if (type === 'V') return 'void';
            if (type === 'Z') return 'boolean';
            if (type === 'I') return 'int';
            if (type === 'B') return 'byte';
            if (type === 'S') return 'short';
            if (type === 'C') return 'char';
            if (type === 'J') return 'long';
            if (type === 'F') return 'float';
            if (type === 'D') return 'double';
            if (type.startsWith('[')) return formatSmaliType(type.substring(1)) + '[]';
            if (type.startsWith('L')) {
                const parts = type.substring(1, type.length - 1).split('/');
                return parts[parts.length - 1];
            }
            return type;
        }

        function getModIcons(modsStr) {
            if (!modsStr) return '';
            const mods = modsStr.trim().split(/\s+/);
            const icons = [];
            
            if (mods.includes('public')) icons.push('<span class="mod-icon mod-public" title="public">○</span>');
            else if (mods.includes('private')) icons.push('<span class="mod-icon mod-private" title="private">●</span>');
            else if (mods.includes('protected')) icons.push('<span class="mod-icon mod-protected" title="protected">◐</span>');
            
            if (mods.includes('static')) icons.push('<span class="mod-icon mod-static" title="static">S</span>');
            if (mods.includes('final')) icons.push('<span class="mod-icon mod-final" title="final">F</span>');
            if (mods.includes('abstract')) icons.push('<span class="mod-icon mod-abstract" title="abstract">A</span>');
            if (mods.includes('synthetic')) icons.push('<span class="mod-icon mod-synthetic" title="synthetic">⚙</span>');
            
            return icons.join('');
        }

        function parseSmaliArgs(argsStr) {
            if (!argsStr) return [];
            const args = [];
            let i = 0;
            while (i < argsStr.length) {
                const c = argsStr[i];
                if ('ZIBSCJFD'.includes(c)) { args.push(formatSmaliType(c)); i++; }
                else if (c === '[') {
                    let j = i;
                    while (argsStr[j] === '[') j++;
                    if (argsStr[j] === 'L') {
                        const end = argsStr.indexOf(';', j);
                        args.push(formatSmaliType(argsStr.substring(i, end + 1)));
                        i = end + 1;
                    } else { args.push(formatSmaliType(argsStr.substring(i, j + 1))); i = j + 1; }
                } else if (c === 'L') {
                    const end = argsStr.indexOf(';', i);
                    args.push(formatSmaliType(argsStr.substring(i, end + 1)));
                    i = end + 1;
                } else { i++; }
            }
            return args;
        }

export { extractClassInfo, extractClassName, detectClassType, extractDependencies, parseSmaliArgs, formatSmaliType, getModIcons };
