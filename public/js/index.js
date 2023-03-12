/* Фунция рендера */

function render(virtualDom, realDomRoot) {
    const evaluatedVirtualDom = evaluate(virtualDom)

    const virtualDomRoot = {
        type: realDomRoot.tagName.toLowerCase(),
        props: {
            id: realDomRoot.id,
            ...realDomRoot.attributes,
            children: [
                evaluatedVirtualDom
            ]

        }
    }

    sync(virtualDomRoot, realDomRoot)
}

function renderView(state) {
    render(Header({state}), document.getElementById('root'))
}

/* ========================================================================= */


/* Состояние инициализации */

const initialState  = {
    time: new Date()
}

/* Добавление редьюсера, который в зависимости от переданного типа экшена возвращает новое состояние */

function appReducer(state = initialState, action) {
    switch (action.type) {
        case 'setTime':
            return {
                ...state,
                time: action.time
            }
        default:
            return state
    }
}


/* Класс хранилища, который принимает в себя состояние и редьюсер */

class Store {
    constructor(reducer, state) {
        this.reducer = reducer
        this.state = reducer(state, { type: null })
        this.listeners = []
    }

    subscribe (listener) {
        this.listeners.push(listener)

        return () => {
            const index = this.listeners.indexOf(listener)
            this.listeners.splice(index, 1)
        }
    }

    dispatch(action) {
        this.state = this.reducer(this.state, action)
        this.listeners.forEach((listener) => listener())
    }

    getState () {
        return this.state
    }
}

/* создание экземпляра класса хранилища */

const store = new Store(appReducer, initialState)

function evaluate(virtualNode) {
    if (typeof virtualNode !== 'object') {
        return virtualNode
    }
    if (typeof virtualNode.type ===  'function') {
        return evaluate((virtualNode.type)(virtualNode.props))
    }

    const props = virtualNode.props || {}

    return {
        ...virtualNode,
        props: {
            ...props,
            children: Array.isArray(props.children) ? props.children.map(evaluate) : [evaluate(props.children)]
        }
    }
}


/* Функция, которая проверяет разницу между деревьями и передает изменения realNode */

function sync (virtualNode, realNode) {
    if (virtualNode.props) {
        Object.entries(virtualNode.props).forEach(([name, value])=> {
            if (name === 'children' && name === 'key') {
                return
            }
            if (realNode[name] !== value) {
                realNode[name] = value
            }
        })
    }

    if (virtualNode.key) {
        realNode.dataset.key = virtualNode.key
    }

    if (typeof virtualNode !== 'object' && virtualNode !== realNode.nodeValue) {
        realNode.nodeValue = virtualNode
    }

    const virtualChildren = virtualNode.props ? virtualNode.props.children || [] : []
    const realChildren = realNode.childNodes

    for (let i = 0; i < virtualChildren.length || i < realChildren.length; i++) {
        const virtual = virtualChildren[i]
        const real = realChildren[i]

        if (virtual === undefined && real !== undefined) {
            realNode.remove(real)
        }

        if (virtual !== undefined && real !== undefined && (virtual.type || '') === (real.tagName || '').toLowerCase()) {
            sync(virtual, real)
        }

        if (virtual !== undefined && real !== undefined && (virtual.type || '') !== (real.tagName || '').toLowerCase()) {
            const newReal = createRealNodeByVirtual(virtual)
            sync(virtual, newReal)
            realNode.replaceChild(newReal, real)
        }

        if (virtual !== undefined && real === undefined) {
            const newReal = createRealNodeByVirtual(virtual)
            sync(virtual, newReal)
            realNode.appendChild(newReal)
        }
    }
}


/* Создание рекальной ноды на основе виртуальной для того, чтобы прокинуть в дальнейшем*/
function createRealNodeByVirtual(virtual) {
    if (typeof virtual !== 'object') {
        return document.createTextNode('')
    }
    return document.createElement(virtual.type)
}


/* ========================================================================================= */


/*Создание компонента header с дочерним компонентом Clock*/

function Header({state}) {
    return vDom.createElement(
        'header',
        { className: 'header' },
        vDom.createElement(
            Clock,
            {time: state.time}
        )
    )
}

function Clock({time}) {
    return vDom.createElement('div', { className: 'logo' }, time.toLocaleTimeString())
}

/* слушатель, который при изменении состояния будет запускать ререндер */
store.subscribe(() => {
    renderView(store.getState())
})


/* каждую секунду меняем состояние */
setInterval(() => {
    store.dispatch({
        type: 'setTime',
        time: new Date()
    })
}, 1000)

const vDom = {
    createElement: (type, config, ...children) => {
        const key = config ? (config.key || null) : null
        const props = config || {}

        if (children.length === 1) {
            props.children = children[0]
        } else {
            props.children = children
        }

        return {
            type,
            key,
            props
        }
    }
}

renderView(store.getState())
