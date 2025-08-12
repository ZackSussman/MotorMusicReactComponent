import React, {useState, useEffect, useRef} from "react";
import MonacoEditor, {loader} from "@monaco-editor/react";
import {initializeMotorMusicRuntime, DEFAULT_SYLLABLE_TIME} from  "motormusic-runtime";
import {MotorMusicTokensProvider} from "motormusic-runtime";
import {FaPlay} from 'react-icons/fa';

const DEFAULT_CODE = `(
    (
        ((twin ^ kl) (twin ^ kl) (li ^ tle) . 2star )
        ((how ^ i)  (won ^ der)  (what ^ you) . 2arr )
        ((up ^ a) (bovv ^ the)  (world ^ so) . 2hii )
      ^
        ((liek ^ a) (dia ^ mond) (in ^ the) . 2skyy )
    )
    (twin kle twin kle li tl . 2star )
    how i won der what you 
.
    6arr
)`;

const EDITOR_BACKGROUND_COLOR = "#171617";

function registerLanguageAndTheme(monaco) {
    if (!monaco) {
      console.error("Monaco is undefined in registerLanguageAndTheme");
      return;
    }
    monaco.languages.register({id: "MotorMusic"});
    monaco.languages.setTokensProvider('MotorMusic', new MotorMusicTokensProvider());
    
    monaco.editor.defineTheme('MotorMusicTheme', {
    base: 'vs',
    inherit: false,
    colors: {
      "editor.background": EDITOR_BACKGROUND_COLOR,
      "editor.lineHighlightBorder": '#424242',
      "editorLineNumber.foreground": "#00ffe0",
      "editorLineNumber.activeForeground": '#0bf098',
      "editorCursor.foreground": "#c933ffa6",
      "editor.selectionBackground": "#547a7a5c",
      "editor.lineHighlightBackground": "#111111",
      "editor.lineHighlightBorder": "#00000000",
      "editorBracketHighlight.foreground1": "#1ca182",
      "editorBracketHighlight.foreground2": "#6b90ff",
      "editorBracketHighlight.foreground3": "#fe00ff",
      "editorBracketHighlight.unexpectedBracket.foreground": "#ff0000"
    },
    rules: [
      { token: 'lparen1.MotorMusic', foreground: '#1ca182', fontStyle: 'bold' },
      { token: 'rparen1.MotorMusic', foreground: '#1ca182', fontStyle: 'bold' },
      { token: 'lparen2.MotorMusic', foreground: '#6b90ff', fontStyle: 'bold' },
      { token: 'rparen2.MotorMusic', foreground: '#6b90ff', fontStyle: 'bold' },
      { token: 'lparen0.MotorMusic', foreground: '#fe00ff', fontStyle: 'bold' },
      { token: 'rparen0.MotorMusic', foreground: '#fe00ff', fontStyle: 'bold' },
      { token: 'lcurly0.MotorMusic', foreground: '#1ca182' },
      { token: 'lcurly1.MotorMusic', foreground: '#6b90ff' },
      { token: 'lcurly2.MotorMusic', foreground: '#fe00ff' },
      { token: 'rcurly0.MotorMusic', foreground: '#1ca182' },
      { token: 'rcurly1.MotorMusic', foreground: '6b90ff' },
      { token: 'rcurly2.MotorMusic', foreground: '#fe00ff' },
      { token: 'number.MotorMusic', foreground: '#0075ff' },
      { token: 'syllable.MotorMusic', foreground: '#0075ff' },
      { token: 'underscore.MotorMusic', foreground: '#0075ff' },
      { token: 'unrecognized.MotorMusic', foreground: 'FF0000' },
      { token: 'langle.MotorMusic', foreground: '#8080B0' },
      { token: 'rangle.MotorMusic', foreground: '#8080B0' },
      { token: 'dotp1.MotorMusic', foreground: '#1ca182', fontStyle: 'bold' },
      { token: 'dotp2.MotorMusic', foreground: '#6b90ff', fontStyle: 'bold' },
      { token: 'dotp0.MotorMusic', foreground: '#fe00ff', fontStyle: 'bold' },
      { token: 'overlinep1.MotorMusic', foreground: '#1ca182', fontStyle: 'bold' },
      { token: 'overlinep2.MotorMusic', foreground: '#6b90ff', fontStyle: 'bold' },
      { token: 'overlinep0.MotorMusic', foreground: '#fe00ff', fontStyle: 'bold' },
    ]
  });

  monaco.languages.setLanguageConfiguration('MotorMusic', {
    autoClosingPairs: [
      { open: '(', close: ' )' },
    ],
    surroundingPairs: [
      { open: '(', close: ')' },
    ]
  });

}


function MotorMusicEditor({initialCode = DEFAULT_CODE, height = '100px', width = '600px', lineNumbers = "on", disableDSTPMInput = false}) {

    const editorRef = useRef(null);
    const currentColorMap = useRef(); //TODO: understand why there is no null here (any difference?)
    const [code, setCode] = useState(initialCode);
    const [syllableTime, setSyllableTime] = useState(DEFAULT_SYLLABLE_TIME);
    const [isCurrentCodeCompiled, setIsCurrentCodeCompiled] = useState(false);
    const [areWeCurrentlyPlayingBack, setAreWeCurrentlyPlayingBack] = useState(false);
    const [isEditorReady, setIsEditorReady] = useState(false);

     const mmRuntime = useRef(initializeMotorMusicRuntime(() => {setAreWeCurrentlyPlayingBack(true)}, () => {setAreWeCurrentlyPlayingBack(false)}));


    useEffect(() => {
        loader.init().then(monaco => {
          registerLanguageAndTheme(monaco);
        }).catch(error => {
          console.log("failed to initialize monaco: ", error);
        });
        mmRuntime.current.audioRuntime.initializeAudioContext();
        mmRuntime.current.animationRuntime.setSyllableTime(syllableTime);
     }, []);



    useEffect(() => {
        console.log("syllableTime changed: ", syllableTime);
    
        if (isEditorReady) {
            mmRuntime.current.animationRuntime.setSyllableTime(syllableTime);
            consumeText(code);
        }
    }, [syllableTime, isEditorReady]);

    function consumeText(newCode) {
        setCode(newCode);
        const [colorMap, getAnimationInfoFunction, computedAudio, errors] = mmRuntime.current.globalRuntime.process(newCode);
        if (errors.length === 0 && getAnimationInfoFunction && computedAudio && colorMap) {
            mmRuntime.current.audioRuntime.setComputedAudio(computedAudio);
            mmRuntime.current.animationRuntime.setGetAnimationInfoFunction(getAnimationInfoFunction);
            mmRuntime.current.animationRuntime.repaintColors(editorRef.current, document, colorMap);
            currentColorMap.current = colorMap;
            setIsCurrentCodeCompiled(true);
        }
        else {
            setIsCurrentCodeCompiled(false); 
            console.log("Compilation errors: ", errors);
        }

        if (editorRef.current) {
           monaco.editor.setModelMarkers(editorRef.current.getModel(), "owner", errors.map(
                error => ({
                    message: error.message,
                    severity: monaco.MarkerSeverity.Error,
                    startLineNumber: error.startLine,
                    startColumn: error.startCol,
                    endLineNumber: error.endLine,
                    endColumn: error.endCol,
                })
           )) 
        }
    }

    async function runCode() {
        if (isCurrentCodeCompiled && !areWeCurrentlyPlayingBack) {
            const audioStartTime = await mmRuntime.current.audioRuntime.beginNewPlayback();
            mmRuntime.current.animationRuntime.initiateAnimation(editorRef.current, document, currentColorMap.current, audioStartTime);
        }
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'cetner',
        height: height,
        width: '100%',
        marginTop: 4 // reduce top margin for more space
      }}>
        <div style = {{
          height: height,
          width,
          border: '1px solid #ccc',
          borderRadius: '3px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          overflow: 'visible',
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
          padding: 0,
          margin: 0,
        }}>
          <div style = {{flex: 1, minWidth: 0}} >
            <MonacoEditor
              language="MotorMusic"
              value={code}
              theme="MotorMusicTheme"
              height={height}
              options={{
                overviewRulerLanes: 0,
                automaticLayout: true,
                fontSize: 18,
                minimap: { enabled: false },
                matchBrackets: "near",
                bracketPairColorization: { enabled: false },
                scrollBeyondLastLine: false,
                smoothScrolling: false,
                glyphMargin: false,
                folding: false,
                lineNumbers: lineNumbers,
                renderLineHighlight: 'none',
                stickyScroll: { enabled: false },
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'hidden',
                  alwaysConsumeMouseWheel: false
                },
                automaticLayout: true,
                readOnly: areWeCurrentlyPlayingBack,
                ...(lineNumbers !== "off" ? {
                  lineNumbersMinChars: 3,
                  lineDecorationsWidth: 16,
                  padding: {
                    top: 0,
                    bottom: 0,
                    left: 16,
                    right: 0
                  }
                } : {
                  padding: {
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0
                  }
                })
              }}
              onMount={(editor) => {
                editorRef.current = editor;
                setIsEditorReady(true);
                consumeText(code);
                if (lineNumbers == "off") {
                  editor.addCommand(monaco.KeyCode.Enter, () => {
                    // Do nothing on Enter key — disables new line
                  });
                }
              }}
              onChange={consumeText}
            />
          </div>
          <button
            disabled={!isCurrentCodeCompiled || areWeCurrentlyPlayingBack}
            onClick={runCode}
            style={{
              backgroundColor: EDITOR_BACKGROUND_COLOR,
              border: 'none',
              height: '100%',
              padding: '0 12px',
              fontSize: '18px',
              cursor: (!isCurrentCodeCompiled || areWeCurrentlyPlayingBack) ? 'not-allowed' : 'pointer',
              display: 'flex',
              outline: 'none',
              boxShadow: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 0
            }}
          >
            <FaPlay style={{ color: (!isCurrentCodeCompiled || areWeCurrentlyPlayingBack) ? '#888' : '#fff' }} />
          </button>
        </div>
        { !disableDSTPMInput && (
          <div style={{ width: width, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
            <label htmlFor="dstpm-input" style={{ marginRight: 8, color: '#fff', fontSize: 14 }}>DSTPM:</label>
            <input
              id="dstpm-input"
              type="number"
              min={1}
              step="any"
              value={syllableTime}
              disabled={areWeCurrentlyPlayingBack}
              onChange={e => {
                const val = e.target.value;
                // Allow empty string for editing
                if (val === "") {
                  setSyllableTime("");
                } else {
                  const num = Number(val);
                  if (num >= 1) setSyllableTime(val);
                }
              }}
              onBlur={e => {
                // If left empty, reset to 1
                if (e.target.value === "") setSyllableTime(1);
                else setSyllableTime(Number(e.target.value));
                e.target.style.border = '1.5px solid #444';
              }}
              style={{
                width: 90,
                fontSize: 15,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1.5px solid #444',
                background: '#23232b',
                color: '#00ffe0',
                outline: 'none',
                marginRight: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                transition: 'border 0.2s, box-shadow 0.2s',
                fontWeight: 500,
                letterSpacing: 0.5,
                appearance: 'textfield',
                MozAppearance: 'textfield',
                WebkitAppearance: 'none',
                opacity: areWeCurrentlyPlayingBack ? 0.6 : 1,
                cursor: areWeCurrentlyPlayingBack ? 'not-allowed' : 'auto',
              }}
              onFocus={e => e.target.style.border = '1.5px solid #00ffe0'}
            />
            <style>{`
              #dstpm-input::-webkit-outer-spin-button, #dstpm-input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
              }
              #dstpm-input[type=number] {
                -moz-appearance: textfield;
              }
            `}</style>
            <span style={{ color: '#aaa', fontSize: 13 }}>(syllable time pulses per minute)</span>
          </div>
        )}
      </div>
    );

}


export default MotorMusicEditor;