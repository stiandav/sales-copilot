// FileReaderEngine — extracts text from PDF, DOCX, RTF, images, and text files
// Runs entirely in the browser, no server needed
var FileReaderEngine = (function () {

  // ---- File type detection ----
  function detectType(file) {
    var name = (file.name || '').toLowerCase();
    if (name.endsWith('.pdf')) return 'pdf';
    if (name.endsWith('.docx')) return 'docx';
    if (name.endsWith('.doc')) return 'doc';
    if (name.endsWith('.rtf')) return 'rtf';
    if (name.endsWith('.txt') || name.endsWith('.text') || name.endsWith('.csv') || name.endsWith('.md')) return 'text';
    if (/\.(jpe?g|png|gif|webp|bmp|heic|tiff?)$/i.test(name)) return 'image';
    // Check MIME type as fallback
    var mime = file.type || '';
    if (mime === 'application/pdf') return 'pdf';
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
    if (mime === 'application/msword') return 'doc';
    if (mime === 'application/rtf' || mime === 'text/rtf') return 'rtf';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('text/')) return 'text';
    return 'unknown';
  }

  // ---- Main extraction entry point ----
  function extractText(file) {
    var type = detectType(file);
    switch (type) {
      case 'text': return readAsText(file);
      case 'pdf': return extractFromPDF(file);
      case 'docx': return extractFromDOCX(file);
      case 'rtf': return extractFromRTF(file);
      case 'doc': return Promise.resolve({
        text: '',
        error: 'Old .doc format is not supported. Please save as .docx or .pdf and upload again.'
      });
      case 'image': return Promise.resolve({
        text: '',
        error: 'Image uploaded. To extract scripts from images:\n1. Open the image in Google Chrome\n2. Right-click → "Copy text from image" (Google Lens)\n3. Paste the text into the box above\n\nOr manually type the scripts from the image.',
        isImage: true,
        imageFile: file
      });
      default: return readAsText(file);
    }
  }

  // ---- Plain text files ----
  function readAsText(file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () { resolve({ text: reader.result || '' }); };
      reader.onerror = function () { resolve({ text: '', error: 'Could not read this file.' }); };
      reader.readAsText(file);
    });
  }

  // ==================================================================
  // PDF TEXT EXTRACTION
  // ==================================================================
  function extractFromPDF(file) {
    return file.arrayBuffer().then(function (buffer) {
      var bytes = new Uint8Array(buffer);
      return parsePDFText(bytes);
    }).then(function (text) {
      if (!text || text.trim().length < 20) {
        return {
          text: '',
          error: 'Could not extract text from this PDF — it may be a scanned image. Try copy-pasting the text instead.'
        };
      }
      return { text: text };
    }).catch(function (e) {
      return {
        text: '',
        error: 'PDF parsing error. Try copy-pasting the text instead.'
      };
    });
  }

  function parsePDFText(bytes) {
    var raw = bytesToLatin1(bytes);
    var textParts = [];

    // Find all PDF objects and their streams
    var objRegex = /(\d+)\s+(\d+)\s+obj([\s\S]*?)endobj/g;
    var objMatch;
    var promises = [];

    while ((objMatch = objRegex.exec(raw)) !== null) {
      var objContent = objMatch[3];
      var isFlate = objContent.indexOf('/FlateDecode') !== -1;
      var isText = objContent.indexOf('/Type /Page') !== -1 ||
                   objContent.indexOf('/Type/Page') !== -1 ||
                   objContent.indexOf('/Length') !== -1;

      var streamMatch = /stream\r?\n([\s\S]*?)\r?\nendstream/.exec(objContent);
      if (!streamMatch) {
        streamMatch = /stream\r?\n([\s\S]*?)endstream/.exec(objContent);
      }
      if (streamMatch) {
        var streamHeaderEnd = objContent.indexOf(streamMatch[0]) + streamMatch[0].indexOf('\n') + 1;
        // Find the absolute position in the original byte array
        var objAbsStart = objMatch.index + 'x x obj'.length; // approximate
        var streamTag = objContent.indexOf('stream');
        var streamNL = objContent.indexOf('\n', streamTag);
        if (streamNL === -1) streamNL = objContent.indexOf('\r', streamTag);
        var dataStartRel = streamNL + 1;
        var endstreamRel = objContent.indexOf('endstream');
        var dataEndRel = endstreamRel;
        // Trim trailing newlines
        while (dataEndRel > dataStartRel &&
               (objContent.charCodeAt(dataEndRel - 1) === 10 || objContent.charCodeAt(dataEndRel - 1) === 13)) {
          dataEndRel--;
        }

        var absObjStart = objMatch.index + objMatch[0].indexOf(objContent);
        var absDataStart = absObjStart + dataStartRel;
        var absDataEnd = absObjStart + dataEndRel;
        var streamBytes = bytes.slice(absDataStart, absDataEnd);

        if (isFlate && streamBytes.length > 0) {
          promises.push(
            decompressFlate(streamBytes).then(function (decompressed) {
              var text = bytesToLatin1(new Uint8Array(decompressed));
              return extractTextOps(text);
            }).catch(function () { return ''; })
          );
        } else if (streamBytes.length > 0) {
          var plainStream = bytesToLatin1(streamBytes);
          var extracted = extractTextOps(plainStream);
          if (extracted) textParts.push(extracted);
        }
      }
    }

    if (promises.length === 0) {
      return Promise.resolve(textParts.join('\n').trim());
    }

    return Promise.all(promises).then(function (results) {
      for (var i = 0; i < results.length; i++) {
        if (results[i]) textParts.push(results[i]);
      }
      return textParts.join('\n').trim();
    });
  }

  // Decompress FlateDecode (zlib/deflate) using DecompressionStream
  function decompressFlate(compressedBytes) {
    if (typeof DecompressionStream === 'undefined') {
      return Promise.reject(new Error('DecompressionStream not available'));
    }

    // Try 'deflate' first (zlib wrapper, most common in PDF)
    return tryDecompress(compressedBytes, 'deflate').catch(function () {
      // Fallback to 'raw' deflate
      return tryDecompress(compressedBytes, 'raw');
    });
  }

  function tryDecompress(data, format) {
    return new Promise(function (resolve, reject) {
      try {
        var blob = new Blob([data]);
        var ds = new DecompressionStream(format);
        var stream = blob.stream().pipeThrough(ds);
        var reader = stream.getReader();
        var chunks = [];

        function pump() {
          reader.read().then(function (result) {
            if (result.done) {
              var total = 0;
              for (var i = 0; i < chunks.length; i++) total += chunks[i].length;
              var out = new Uint8Array(total);
              var off = 0;
              for (var j = 0; j < chunks.length; j++) {
                out.set(chunks[j], off);
                off += chunks[j].length;
              }
              resolve(out.buffer);
              return;
            }
            chunks.push(result.value);
            pump();
          }).catch(reject);
        }
        pump();
      } catch (e) {
        reject(e);
      }
    });
  }

  // Extract text from PDF content stream operators (BT...ET blocks)
  function extractTextOps(stream) {
    var parts = [];
    var btRegex = /BT([\s\S]*?)ET/g;
    var btMatch;
    var lastWasNewline = false;

    while ((btMatch = btRegex.exec(stream)) !== null) {
      var block = btMatch[1];

      // Check for line breaks via Td/TD operators (large Y movement = new line)
      var lines = block.split(/\r?\n/);
      for (var li = 0; li < lines.length; li++) {
        var line = lines[li].trim();

        // Detect newline from Td/TD with Y offset
        var tdMatch = /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+T[dD]/.exec(line);
        if (tdMatch) {
          var yMove = parseFloat(tdMatch[2]);
          if (Math.abs(yMove) > 1) {
            if (!lastWasNewline) {
              parts.push('\n');
              lastWasNewline = true;
            }
          }
        }

        // Tj operator: (text) Tj
        var tjRegex = /\(((?:[^\\)]|\\.)*)\)\s*Tj/g;
        var tjMatch;
        while ((tjMatch = tjRegex.exec(line)) !== null) {
          parts.push(decodePDFString(tjMatch[1]));
          lastWasNewline = false;
        }

        // TJ operator: [...] TJ (array of strings and numbers)
        var tjArrRegex = /\[([\s\S]*?)\]\s*TJ/gi;
        var arrMatch;
        while ((arrMatch = tjArrRegex.exec(line)) !== null) {
          var arrContent = arrMatch[1];
          // Extract strings from the array
          var strRegex = /\(((?:[^\\)]|\\.)*)\)/g;
          var strMatch;
          while ((strMatch = strRegex.exec(arrContent)) !== null) {
            parts.push(decodePDFString(strMatch[1]));
            lastWasNewline = false;
          }
          // Check for large negative kerning (word space)
          var kernRegex = /\)\s*(-?\d+)\s*\(/g;
          var kernMatch;
          while ((kernMatch = kernRegex.exec(arrContent)) !== null) {
            if (Math.abs(parseInt(kernMatch[1])) > 100) {
              // Insert space for large kerning gaps
            }
          }
        }

        // Hex strings: <hex> Tj
        var hexTjRegex = /<([0-9A-Fa-f\s]+)>\s*Tj/g;
        var hexMatch;
        while ((hexMatch = hexTjRegex.exec(line)) !== null) {
          parts.push(decodeHexString(hexMatch[1].replace(/\s/g, '')));
          lastWasNewline = false;
        }
      }
    }

    return parts.join('');
  }

  function decodePDFString(str) {
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\')
      .replace(/\\([()])/g, '$1');
  }

  function decodeHexString(hex) {
    var str = '';
    for (var i = 0; i + 1 < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  }

  // ==================================================================
  // DOCX TEXT EXTRACTION
  // ==================================================================
  function extractFromDOCX(file) {
    return file.arrayBuffer().then(function (buffer) {
      return parseDOCXText(new Uint8Array(buffer));
    }).then(function (text) {
      if (!text || text.trim().length < 10) {
        return { text: '', error: 'Could not extract text from this DOCX. Try copy-pasting the text instead.' };
      }
      return { text: text };
    }).catch(function (e) {
      return { text: '', error: 'DOCX parsing error: ' + e.message + '. Try copy-pasting the text.' };
    });
  }

  function parseDOCXText(bytes) {
    // Find End of Central Directory Record (EOCD)
    var eocdPos = -1;
    for (var i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4B && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
        eocdPos = i;
        break;
      }
    }
    if (eocdPos === -1) return Promise.reject(new Error('Not a valid ZIP/DOCX file'));

    var cdOffset = readU32(bytes, eocdPos + 16);
    var cdCount = readU16(bytes, eocdPos + 10);

    // Parse central directory
    var entries = [];
    var pos = cdOffset;
    for (var e = 0; e < cdCount && pos < bytes.length - 46; e++) {
      if (bytes[pos] !== 0x50 || bytes[pos + 1] !== 0x4B || bytes[pos + 2] !== 0x01 || bytes[pos + 3] !== 0x02) break;
      var compMethod = readU16(bytes, pos + 10);
      var compSize = readU32(bytes, pos + 20);
      var nameLen = readU16(bytes, pos + 28);
      var extraLen = readU16(bytes, pos + 30);
      var commentLen = readU16(bytes, pos + 32);
      var localOffset = readU32(bytes, pos + 42);
      var name = '';
      for (var n = 0; n < nameLen; n++) name += String.fromCharCode(bytes[pos + 46 + n]);
      entries.push({ name: name, compMethod: compMethod, compSize: compSize, offset: localOffset });
      pos += 46 + nameLen + extraLen + commentLen;
    }

    // Find word/document.xml
    var docEntry = null;
    for (var j = 0; j < entries.length; j++) {
      if (entries[j].name === 'word/document.xml') {
        docEntry = entries[j];
        break;
      }
    }
    if (!docEntry) return Promise.reject(new Error('word/document.xml not found'));

    // Read local file header
    var lp = docEntry.offset;
    var lNameLen = readU16(bytes, lp + 26);
    var lExtraLen = readU16(bytes, lp + 28);
    var dataStart = lp + 30 + lNameLen + lExtraLen;
    var rawData = bytes.slice(dataStart, dataStart + docEntry.compSize);

    if (docEntry.compMethod === 8) {
      // Deflate — use raw decompression
      return tryDecompress(rawData, 'raw').then(function (buf) {
        return extractTextFromXML(new TextDecoder().decode(buf));
      }).catch(function () {
        return tryDecompress(rawData, 'deflate').then(function (buf) {
          return extractTextFromXML(new TextDecoder().decode(buf));
        });
      });
    } else {
      return Promise.resolve(extractTextFromXML(new TextDecoder().decode(rawData)));
    }
  }

  // Extract readable text from DOCX XML
  function extractTextFromXML(xml) {
    var lines = [];
    // Split by paragraph elements
    var paras = xml.split(/<w:p[\s>\/]/);
    for (var i = 1; i < paras.length; i++) {
      var para = paras[i];
      var endIdx = para.indexOf('</w:p>');
      if (endIdx !== -1) para = para.substring(0, endIdx);
      // Extract all <w:t> text runs
      var textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      var m;
      var lineText = '';
      while ((m = textRegex.exec(para)) !== null) {
        lineText += m[1];
      }
      // Check for tab characters
      if (para.indexOf('<w:tab/>') !== -1 || para.indexOf('<w:tab />') !== -1) {
        lineText = lineText.replace(/(\S)\s*$/, '$1\t');
      }
      lines.push(lineText);
    }
    // Clean up: remove empty lines at start/end, collapse 3+ blank lines to 2
    var result = lines.join('\n');
    result = result.replace(/\n{4,}/g, '\n\n\n');
    return result.trim();
  }

  // ==================================================================
  // RTF TEXT EXTRACTION
  // ==================================================================
  function extractFromRTF(file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () {
        var raw = reader.result || '';
        var text = parseRTFText(raw);
        if (!text || text.trim().length < 10) {
          resolve({ text: '', error: 'Could not extract text from this RTF. Try copy-pasting instead.' });
        } else {
          resolve({ text: text });
        }
      };
      reader.onerror = function () { resolve({ text: '', error: 'Could not read RTF file.' }); };
      reader.readAsText(file);
    });
  }

  function parseRTFText(raw) {
    // Remove header/info groups like {\fonttbl...}, {\colortbl...}, {\info...}, etc.
    var depth = 0;
    var skip = false;
    var skipPatterns = ['\\fonttbl', '\\colortbl', '\\stylesheet', '\\info', '\\*', '\\header', '\\footer'];
    var result = '';
    var i = 0;

    while (i < raw.length) {
      var ch = raw[i];
      if (ch === '{') {
        depth++;
        // Check if this group should be skipped
        var ahead = raw.substring(i + 1, i + 20);
        for (var s = 0; s < skipPatterns.length; s++) {
          if (ahead.indexOf(skipPatterns[s]) === 0) {
            // Skip this entire group
            var groupDepth = 1;
            i++;
            while (i < raw.length && groupDepth > 0) {
              if (raw[i] === '{') groupDepth++;
              else if (raw[i] === '}') groupDepth--;
              i++;
            }
            depth--;
            continue;
          }
        }
        i++;
        continue;
      }
      if (ch === '}') {
        depth--;
        i++;
        continue;
      }
      if (ch === '\\') {
        // Control word
        var cw = '';
        i++;
        while (i < raw.length && /[a-zA-Z]/.test(raw[i])) {
          cw += raw[i];
          i++;
        }
        // Skip numeric parameter
        var num = '';
        while (i < raw.length && /[-\d]/.test(raw[i])) {
          num += raw[i];
          i++;
        }
        // Space delimiter
        if (i < raw.length && raw[i] === ' ') i++;

        // Interpret common control words
        if (cw === 'par' || cw === 'line') result += '\n';
        else if (cw === 'tab') result += '\t';
        else if (cw === 'ldblquote' || cw === 'rdblquote') result += '"';
        else if (cw === 'lquote' || cw === 'rquote') result += "'";
        else if (cw === 'endash') result += '-';
        else if (cw === 'emdash') result += '--';
        else if (cw === 'bullet') result += '*';
        else if (ch === '\\' && !cw) { result += '\\'; }
        continue;
      }
      // Regular character
      if (ch !== '\r' && ch !== '\n') {
        result += ch;
      }
      i++;
    }

    return result.replace(/\n{3,}/g, '\n\n').trim();
  }

  // ==================================================================
  // UTILITY
  // ==================================================================
  function bytesToLatin1(bytes) {
    // Convert Uint8Array to string using Latin-1 encoding (preserves byte values)
    var chunks = [];
    var chunkSize = 8192;
    for (var i = 0; i < bytes.length; i += chunkSize) {
      var end = Math.min(i + chunkSize, bytes.length);
      var slice = bytes.subarray(i, end);
      chunks.push(String.fromCharCode.apply(null, slice));
    }
    return chunks.join('');
  }

  function readU16(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }

  function readU32(bytes, offset) {
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
  }

  // ---- Public API ----
  return {
    extractText: extractText,
    detectType: detectType,
    SUPPORTED_EXTENSIONS: '.txt,.text,.csv,.md,.pdf,.docx,.doc,.rtf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.heic,.tiff'
  };
})();
