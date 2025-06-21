import React, {useState, useEffect, useRef} from "react";
import MonacoEditor, {loader} from "@monaco-editor/react";
import {process, beginNewPlayback, initializeAudioRuntime, setComputedAudio,
        setGetAnimationInfoFunction, setSyllableTime, repaintColors, 
        initiateAnimation, areWeCurrentlyPlayingBack, DEFAULT_SYLLABLE_TIME} from  "motormusic-runtime";
import {MotorMusicTokensProvider} from "motormusic-runtime";


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
      "editor.background": '#171617',
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


function MotorMusicEditor(props) {
    const editorRef = useRef(null);
    const currentColorMap = useRef(); //TODO: understand why there is no null here (any difference?)
    const [code, setCode] = useState(props.initialCode || DEFAULT_CODE);
    const [syllableTime, setSyllableTime] = useState(DEFAULT_SYLLABLE_TIME);
    const [isCurrentCodeCompiled, setIsCurrentCodeCompiled] = useState(false);

    useEffect(() => {
        loader.init().then(monaco => {
          registerLanguageAndTheme(monaco);
          consumeText(code);
        }).catch(error => {
          console.log("failed to initialize monaco: ", error);
        });
        initializeAudioRuntime();
        setSyllableTime(syllableTime);
     }, []);

    function consumeText(newCode) {
        setCode(newCode);
        const [colorMap, getAnimationInfoFunction, computedAudio, errors] = process(newCode, syllableTime);
        if (errors.length === 0 && getAnimationInfoFunction && computedAudio && colorMap) {
            setComputedAudio(computedAudio);
            setGetAnimationInfoFunction(getAnimationInfoFunction);
            repaintColors(editorRef.current, document, colorMap);
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
            const audioStartTime = await beginNewPlayback();
            initiateAnimation(editorRef.current, document, currentColorMap.current, audioStartTime);
        }
    }

    return (
 <div>
      <MonacoEditor
        language="MotorMusic"
        value={code}
        theme="MotorMusicTheme"
        height="100%"
        width="100%"
        options={{
          overviewRulerLanes: 0,
          automaticLayout: true,
          fontSize: 18,
          minimap: { enabled: false },
          matchBrackets: "near",
          bracketPairColorization: { enabled: false },
          scrollBeyondLastLine: false,
          smoothScrolling: false
        }}
        onMount={(editor) => {
          editorRef.current = editor;
        }}
        onChange={consumeText}
      />
      <div id="slider-container" style={{ marginTop: 10 }}>
        {/* We will add syllable time slider here in step 2 */}
      </div>
      <button
        disabled={!isCurrentCodeCompiled || areWeCurrentlyPlayingBack}
        onClick={runCode}
        style={{ marginTop: 10 }}
      >
        Run
      </button>
    </div>
    );

}


export default MotorMusicEditor;