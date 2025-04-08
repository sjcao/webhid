import { loadPyodide, PyodideInterface } from 'pyodide';
import { type PyDict } from 'pyodide/ffi';
import * as Comlink from "comlink";
import {syncExpose, SyncExtras} from "comsync";

async function initPyodide() {
  let pyodide = await loadPyodide({
    indexURL: import.meta.env.BASE_URL + './pyodide',
  });
  const py_files = 'webhid.py qdrazer/device.py qdrazer/protocol.py basilisk_v3/device.py';
  await pyodide.runPythonAsync(`
    from pyodide.http import pyfetch
    from asyncio import gather
    import os
    def safe_open_wb(path):
      ''' Open "path" for writing, creating any parent directories as needed.
      '''
      p = os.path.dirname(path)
      if p:
        os.makedirs(p, exist_ok=True)
      return open(path, 'wb')
    async def fetch_py(root, filename):
      print(f'fetching py file {filename}')
      response = await pyfetch(root + filename)
      with safe_open_wb(filename) as f:
        f.write(await response.bytes())
  
    py_files = '${py_files}'
    py_files = py_files.split(' ')
    await gather(*[fetch_py('${import.meta.env.BASE_URL}' + 'py/', fn) for fn in py_files])
  `);
  await pyodide.runPythonAsync(`
    import shutil
    shutil.copy('webhid.py', 'hid.py')
  `);
  await pyodide.runPythonAsync('import hid');
  return pyodide;
}

var pyodide: PyodideInterface | null = null;
type NotifyCallback = (name: string, ...args: any[]) => any;

var savedSyncExtras: SyncExtras | null = null;
var savedNotifyCallback: NotifyCallback | null = null;

function await_js(code: string) {
  if (!savedSyncExtras || !savedNotifyCallback) {
    throw new Error('no sync extras and notify callback');
  }
  savedNotifyCallback('await_js', code);
  const [succeeded, result] = savedSyncExtras.readMessage();
  if (!succeeded) {
    throw new Error(result);
  }
  return result;
}

var pyGlobal: PyDict | null = null;

Comlink.expose({
  init: async () => {
    pyodide = await initPyodide();
  },
  setStdout: (notifyCallback: NotifyCallback) => {
    if (pyodide === null) {
      throw new Error('pyodide is not initialized');
    }
    pyodide.setStdout({batched: (str) => notifyCallback('print', str)});
  },
  runPython: syncExpose(async (syncExtras, code, options, notifyCallback: NotifyCallback) => {
    if (pyodide === null) {
      throw new Error('pyodide is not initialized');
    }
    if (pyGlobal === null) {
      pyGlobal = pyodide.toPy({}) as PyDict;
    }
    savedSyncExtras = syncExtras;
    savedNotifyCallback = notifyCallback;
    options = options ?? {};
    const repr = options.repr;
    delete options.repr;
    const add = options.add;
    delete options.add;
    options.globals = pyodide.toPy(options.globals) ?? pyGlobal;
    if (add) {
      options.globals.update(pyodide.toPy(add));
    }
    options.globals.set('syncExtras', syncExtras);
    options.globals.set('notifyCallback', notifyCallback);
    options.globals.set('await_js', await_js);
    options.locals = pyodide.toPy(options.locals);
    const result = await pyodide.runPythonAsync(code, options);
    pyGlobal.set('_result', result);
    if (repr) {
      return pyodide.runPython('repr(result)', {locals: pyodide.toPy({result: result})});
    }
    if (result && result.toJs) {
      return result.toJs({dict_converter : Object.fromEntries});
    }
    return result;
  }),
  runTest: syncExpose((syncExtras, notifyCallback) => {
    notifyCallback('world');
    let m = syncExtras.readMessage();
    notifyCallback('hello');
    m = syncExtras.readMessage();
  }),
});
