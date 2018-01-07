let g:ale_linters = {
      \   'javascript': ['standard'],
      \}

let g:vigun_commands = [
      \ {
      \   'pattern': 'features/.*feature$',
      \   'normal': './test-local',
      \   'debug': './test-local-debug',
      \ }
      \]
