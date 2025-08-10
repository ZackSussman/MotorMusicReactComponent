import React, {useState, useEffect, useRef} from "react";
import MonacoEditor, {loader} from "@monaco-editor/react";
import {initializeMotorMusicRuntime, DEFAULT_SYLLABLE_TIME, process} from  "motormusic-runtime";
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


function MotorMusicEditor({initialCode = DEFAULT_CODE, height = '100px', width = '600px', lineNumbers = "on"}) {
    const mmRuntime = useRef(initializeMotorMusicRuntime());

    const editorRef = useRef(null);
    const currentColorMap = useRef(); //TODO: understand why there is no null here (any difference?)
    const [code, setCode] = useState(initialCode);
    const [syllableTime, setSyllableTime] = useState(DEFAULT_SYLLABLE_TIME);
    const [isCurrentCodeCompiled, setIsCurrentCodeCompiled] = useState(false);

    useEffect(() => {
        loader.init().then(monaco => {
          registerLanguageAndTheme(monaco);
        }).catch(error => {
          console.log("failed to initialize monaco: ", error);
        });
        mmRuntime.current.audioRuntime.initializeAudioContext();
        mmRuntime.current.animationRuntime.setSyllableTime(syllableTime);
     }, []);

    function consumeText(newCode) {
        setCode(newCode);
        const [colorMap, getAnimationInfoFunction, computedAudio, errors] = process(newCode, syllableTime);
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
        if (isCurrentCodeCompiled && !mmRuntime.current.getAreWeCurrentlyPlayingBack()) {
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
            width: '100%'}}>
    <div style = {{
        height: height,
        width,
        border: '1px solid #ccc',
        borderRadius: '3px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'stretch', // changed from 'center' to 'stretch'
        gap: 0, // ensure no gap
        padding: 0, // ensure no padding
        margin: 0 // ensure no margin
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
          scrollbar: {
            vertical: 'hidden',
            horizontal: 'hidden'
          },
          automaticLayout: true,
          ...(lineNumbers !== "off" ? {
            lineNumbersMinChars: 3, // extra space for two-digit line numbers
            lineDecorationsWidth: 16, // extra space between border and line numbers
            padding: {
              top: "4px",
              bottom: 0,
              left: 16,
              right: 0
            }
          } : {
            padding: {
              top: "4px",
              bottom: 0,
              left: 0,
              right: 0
            }
          })
        }}
        onMount={(editor) => {
          editorRef.current = editor;
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
        disabled={!isCurrentCodeCompiled || mmRuntime.current.getAreWeCurrentlyPlayingBack()}
        onClick={runCode}
        style={{
          backgroundColor: EDITOR_BACKGROUND_COLOR,
          border: 'none',
          height: '100%',
          padding: '0 12px',
          fontSize: '18px',
          cursor: (!isCurrentCodeCompiled || mmRuntime.current.getAreWeCurrentlyPlayingBack()) ? 'not-allowed' : 'pointer',
          display: 'flex',
          outline: 'none',
          boxShadow: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 0
        }}
      >
        <FaPlay style={{ color: (!isCurrentCodeCompiled || mmRuntime.current.getAreWeCurrentlyPlayingBack()) ? '#888' : '#fff' }} />
      </button>
      </div>

    </div>
    );

}


export default MotorMusicEditor;